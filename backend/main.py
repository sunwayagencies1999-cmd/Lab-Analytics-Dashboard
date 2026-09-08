from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import Optional
from sqlalchemy import func, desc, extract
import pandas as pd
import io
import models
from database import engine, SessionLocal
from fastapi.middleware.cors import CORSMiddleware
import re
import statistics
from fastapi.responses import StreamingResponse
import csv
import io
from fastapi.responses import StreamingResponse
import csv
import io
from reportlab.lib.pagesizes import landscape, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle
from reportlab.lib import colors

# Ensure the database tables are created
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# Tell FastAPI to trust your Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database Dependency: Opens a secure session for each API request
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 1. This dependency catches query strings on ANY endpoint
def get_filter_params(
    year: Optional[str] = None, month: Optional[str] = None, group: Optional[str] = None,
    section: Optional[str] = None, brand: Optional[str] = None, start_date: Optional[str] = None,
    end_date: Optional[str] = None, customer: Optional[str] = None, test_no: Optional[str] = None,
    po_number: Optional[str] = None, result: Optional[str] = None
):
    return {
        "year": year, "month": month, "group": group, "section": section, "brand": brand,
        "start_date": start_date, "end_date": end_date, "customer": customer, "test_no": test_no,
        "po_number": po_number, "result": result
    }

# 2. Upgraded to handle comma-separated lists using .in_()
def apply_dashboard_filters(query, filters: dict):
    if filters.get("year"):
        query = query.filter(extract('year', models.LabTestRecord.receive_date).in_([int(y) for y in filters["year"].split(",")]))
    if filters.get("month"):
        query = query.filter(extract('month', models.LabTestRecord.receive_date).in_([int(m) for m in filters["month"].split(",")]))
        
    # --- FIX 1: Make Group case-insensitive and ignore trailing spaces ---
    if filters.get("group"):
        groups = [g.lower().strip() for g in filters["group"].split(",")]
        query = query.filter(func.lower(func.trim(models.LabTestRecord.group_name)).in_(groups))
        
    # --- FIX 2: Make Section case-insensitive and ignore trailing spaces ---
    if filters.get("section"):
        sections = [s.lower().strip() for s in filters["section"].split(",")]
        query = query.filter(func.lower(func.trim(models.LabTestRecord.app_section)).in_(sections))
        
    if filters.get("brand"):
        query = query.filter(models.LabTestRecord.brandid.in_(filters["brand"].split(",")))
    if filters.get("customer"):
        query = query.filter(models.LabTestRecord.custcode.in_(filters["customer"].split(",")))
        
    if filters.get("test_no"):
        query = query.filter(models.LabTestRecord.lt_test_no.in_(filters["test_no"].split(",")))
    if filters.get("po_number"):
        query = query.filter(models.LabTestRecord.salespo.in_(filters["po_number"].split(",")))
        
    if filters.get("start_date"):
        query = query.filter(models.LabTestRecord.receive_date >= filters["start_date"])
    if filters.get("end_date"):
        query = query.filter(models.LabTestRecord.receive_date <= f"{filters['end_date']} 23:59:59")
        
    if filters.get("result"):
        res_list = filters["result"].lower().split(",")
        conditions = []
        if "pass" in res_list: conditions.append(models.LabTestRecord.final_result_approve == 'Pass')
        if "fail" in res_list: conditions.append(models.LabTestRecord.final_result_approve == 'Fail')
        if "pending" in res_list: conditions.append(models.LabTestRecord.final_result_approve.is_(None))
        if conditions:
            from sqlalchemy import or_
            query = query.filter(or_(*conditions))
            
    return query


@app.get("/api/dashboard/filter-options")
def get_filter_options(db: Session = Depends(get_db)):
    try:
        years_query = db.query(extract('year', models.LabTestRecord.receive_date))\
            .filter(models.LabTestRecord.receive_date.isnot(None))\
            .distinct().all()
        years = sorted([int(y[0]) for y in years_query if y[0]], reverse=True)

        groups = [g[0] for g in db.query(models.LabTestRecord.group_name).distinct().all() if g[0]]
        sections = [s[0] for s in db.query(models.LabTestRecord.app_section).distinct().all() if s[0]]
        brands = [b[0] for b in db.query(models.LabTestRecord.brandid).distinct().all() if b[0]]
        customers = [c[0] for c in db.query(models.LabTestRecord.custcode).distinct().all() if c[0]]
        test_nos = [t[0] for t in db.query(models.LabTestRecord.lt_test_no).distinct().all() if t[0]]
        po_numbers = [p[0] for p in db.query(models.LabTestRecord.salespo).distinct().all() if p[0]]

        return {
            "years": years,
            "months": [
                {"value": "1", "label": "January"}, {"value": "2", "label": "February"},
                {"value": "3", "label": "March"}, {"value": "4", "label": "April"},
                {"value": "5", "label": "May"}, {"value": "6", "label": "June"},
                {"value": "7", "label": "July"}, {"value": "8", "label": "August"},
                {"value": "9", "label": "September"}, {"value": "10", "label": "October"},
                {"value": "11", "label": "November"}, {"value": "12", "label": "December"},
            ],
            "groups": sorted(groups),
            "sections": sorted(sections),
            "brands": sorted(brands),
            "customers": sorted(customers),
            "test_nos": sorted(test_nos),
            "po_numbers": sorted(po_numbers),
            "results": ["Pass", "Fail", "Pending"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/upload")
async def upload_lab_data(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Invalid file format. Please upload an Excel file.")
    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents), header=1)
        
        # --- FIX: Convert Excel serial dates (like 46174) to valid PostgreSQL datetimes ---
        def convert_to_date(val):
            if pd.isna(val) or val == "" or val is None:
                return None
            if isinstance(val, (int, float)):
                # Excel serial dates represent days since Dec 30, 1899
                return pd.to_datetime('1899-12-30') + pd.to_timedelta(val, 'D')
            # Let pandas handle standard strings/timestamps
            return pd.to_datetime(val, errors='coerce')

        date_cols = ['appdate', 'labtest_date', 'receive_date', 'finishdate', 'cancel_date']
        for col in date_cols:
            if col in df.columns:
                df[col] = df[col].apply(convert_to_date)
        # ---------------------------------------------------------------------------------

        df = df.astype(object).where(pd.notnull(df), None)

        records = []
        for _, row in df.iterrows():
            record = models.LabTestRecord(
                appdate=row.get('appdate'),
                app_section=row.get('app_section'),
                labtest_date=row.get('labtest_date'),
                receive_date=row.get('receive_date'),
                finishdate=row.get('finishdate'),
                group_name=row.get('group'),
                lt_test_no=row.get('lt_test_no'),
                brandid=row.get('brandid'),
                ordertype=row.get('ordertype'),
                salespo=row.get('salespo'),
                plannoid=row.get('plannoid'),
                custcode=row.get('custcode'),
                article_id=row.get('article_id'),
                color_code=row.get('color_code'),
                color_name=row.get('color_name'),
                re_work=row.get('re_work'),
                re_work_remark=row.get('re_work_remark'),
                cancel_date=row.get('cancel_date'),
                lt_remark=row.get('lt_remark'),
                lt_result=row.get('lt_result'),
                lt_result_comment=row.get('lt_result_comment'),
                final_result_approve=row.get('final_result_approve'),
                final_approved_by=row.get('final_approved_by'),
                failgroup=row.get('failgroup'),
                fmin=row.get('fmin'),
                failerid=row.get('failerid'),
                failer_name=row.get('failer_name'),
                failer_remark=row.get('failer_remark'),
                failer_no=row.get('failer_no'),
                correction_attempt=row.get('Correction Attempt')
            )
            records.append(record)

        db.bulk_save_objects(records)
        db.commit()
        return {"status": "success", "message": f"Successfully processed and uploaded {len(records)} records."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")

@app.get("/api/dashboard/kpis")
def get_dashboard_kpis(db: Session = Depends(get_db), filters: dict = Depends(get_filter_params)):
    try:
        base_query = db.query(models.LabTestRecord)
        filtered_query = apply_dashboard_filters(base_query, filters)

        total = filtered_query.count()
        passed = filtered_query.filter(models.LabTestRecord.final_result_approve == 'Pass').count()
        failed = filtered_query.filter(models.LabTestRecord.final_result_approve == 'Fail').count()
        pending = filtered_query.filter(models.LabTestRecord.final_result_approve.is_(None)).count()
        
        rft_rate = round((passed / total * 100), 1) if total > 0 else 0
        
        return {
            "total_submissions": total,
            "passed": passed,
            "failed": failed,
            "rft_rate": f"{rft_rate}%",
            "pending": pending
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/dashboard/records")
def get_dashboard_records(db: Session = Depends(get_db), limit: int = 7, filters: dict = Depends(get_filter_params)):
    try:
        query = db.query(models.LabTestRecord).filter(models.LabTestRecord.receive_date.isnot(None))
        query = apply_dashboard_filters(query, filters)
        
        records = query.order_by(models.LabTestRecord.receive_date.desc()).limit(limit).all()
        return records
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/dashboard/charts/bulk-status")
def get_bulk_status(db: Session = Depends(get_db), filters: dict = Depends(get_filter_params)):
    try:
        query = db.query(models.LabTestRecord)
        query = apply_dashboard_filters(query, filters)

        passed = query.filter(models.LabTestRecord.final_result_approve == 'Pass').count()
        failed = query.filter(models.LabTestRecord.final_result_approve == 'Fail').count()
        
        total = passed + failed
        pass_pct = round((passed / total * 100), 1) if total > 0 else 0
        fail_pct = round((failed / total * 100), 1) if total > 0 else 0

        return [
            {"name": "Pass", "value": passed, "percentage": pass_pct, "fill": "#2dd4bf"}, 
            {"name": "Fail", "value": failed, "percentage": fail_pct, "fill": "#f87171"}
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/dashboard/charts/failure-breakdown")
def get_failure_breakdown(db: Session = Depends(get_db), filters: dict = Depends(get_filter_params)):
    try:
        query = db.query(models.LabTestRecord.lt_result_comment).filter(models.LabTestRecord.final_result_approve == 'Fail')
        query = apply_dashboard_filters(query, filters)
        failed_records = query.all()
        
        total_fails = len(failed_records)
        if total_fails == 0:
            return []

        category_counts = {}
        for record in failed_records:
            comment = record.lt_result_comment
            category = "Unknown"
            
            if comment and str(comment).strip() != "" and str(comment).lower() != "none":
                match = re.search(r'(?i)(width\s*:?\s*\d+(?:\.\d+)?\s*(?:mm)?)', str(comment))
                if match:
                    category = match.group(1).strip()
            
            category_counts[category] = category_counts.get(category, 0) + 1
            
        sorted_categories = sorted(category_counts.items(), key=lambda x: x[1], reverse=True)
        colors = ["#6366f1", "#2dd4bf", "#f59e0b", "#ec4899", "#8b5cf6", "#3b82f6", "#14b8a6"]
        results = []
        
        for index, (name, count) in enumerate(sorted_categories):
            pct = round((count / total_fails * 100), 1)
            results.append({
                "name": name,
                "value": count,
                "percentage": pct,
                "fill": colors[index % len(colors)]
            })
            
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/dashboard/charts/app-section")
def get_app_section_breakdown(db: Session = Depends(get_db), filters: dict = Depends(get_filter_params)):
    try:
        query = db.query(
            models.LabTestRecord.app_section, 
            func.count(models.LabTestRecord.id).label('count')
        )
        query = apply_dashboard_filters(query, filters)
        query = query.group_by(models.LabTestRecord.app_section).order_by(desc('count')).all()

        total_records = sum([row.count for row in query])
        colors = ["#6366f1", "#2dd4bf", "#f59e0b", "#ec4899", "#8b5cf6", "#3b82f6", "#14b8a6"]
        
        results = []
        for index, row in enumerate(query):
            raw_section = row.app_section
            if not raw_section or str(raw_section).strip() == "" or str(raw_section).lower() == "none":
                section = "Unknown"
            else:
                section = str(raw_section).strip()
                
            val = row.count
            pct = round((val / total_records * 100), 1) if total_records > 0 else 0
            
            results.append({
                "name": section,
                "value": val,
                "percentage": pct,
                "fill": colors[index % len(colors)]
            })
            
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/dashboard/charts/group-breakdown")
def get_group_breakdown(db: Session = Depends(get_db), filters: dict = Depends(get_filter_params)):
    try:
        query = db.query(
            models.LabTestRecord.group_name,
            func.count(models.LabTestRecord.id).label('count')
        )
        query = apply_dashboard_filters(query, filters)
        query = query.group_by(models.LabTestRecord.group_name).all()
        
        counts = {}
        for row in query:
            raw_grp = row.group_name
            grp = "Unknown" if not raw_grp or str(raw_grp).strip() in ["", "None"] else str(raw_grp).strip()
            counts[grp] = counts.get(grp, 0) + row.count
            
        sorted_counts = sorted(counts.items(), key=lambda x: x[1], reverse=True)
        colors = ["#6366f1", "#2dd4bf", "#f59e0b", "#ec4899", "#8b5cf6", "#3b82f6", "#14b8a6"]
        
        return [
            {
                "name": name, 
                "value": count, 
                "fill": colors[index % len(colors)]
            } 
            for index, (name, count) in enumerate(sorted_counts)
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/dashboard/charts/bulk-make-order")
def get_bulk_make_order(db: Session = Depends(get_db), filters: dict = Depends(get_filter_params)):
    try:
        query = db.query(models.LabTestRecord)
        query = apply_dashboard_filters(query, filters)

        bulk_make = query.filter(models.LabTestRecord.group_name == 'Bulk_Make').count()
        bulk_order = query.filter(models.LabTestRecord.group_name == 'Bulk_Order').count()
        
        total = bulk_make + bulk_order
        make_pct = round((bulk_make / total * 100), 1) if total > 0 else 0
        order_pct = round((bulk_order / total * 100), 1) if total > 0 else 0

        return [
            {"name": "Bulk Make", "value": bulk_make, "percentage": make_pct, "fill": "#6366f1"}, 
            {"name": "Bulk Order", "value": bulk_order, "percentage": order_pct, "fill": "#2dd4bf"}
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/dashboard/charts/submission-status")
def get_submission_status(db: Session = Depends(get_db), filters: dict = Depends(get_filter_params)):
    try:
        query = db.query(models.LabTestRecord)
        query = apply_dashboard_filters(query, filters)

        passed = query.filter(models.LabTestRecord.final_result_approve == 'Pass').count()
        failed = query.filter(models.LabTestRecord.final_result_approve == 'Fail').count()
        
        total = passed + failed
        pass_pct = round((passed / total * 100), 1) if total > 0 else 0
        fail_pct = round((failed / total * 100), 1) if total > 0 else 0

        return [
            {"name": "Pass", "value": passed, "percentage": pass_pct, "fill": "#22c55e"}, 
            {"name": "Fail", "value": failed, "percentage": fail_pct, "fill": "#ef4444"}
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/dashboard/charts/article-breakdown")
def get_article_breakdown(db: Session = Depends(get_db), filters: dict = Depends(get_filter_params)):
    try:
        query = db.query(
            models.LabTestRecord.article_id,
            func.count(models.LabTestRecord.id).label('count')
        )
        query = apply_dashboard_filters(query, filters)
        query = query.group_by(models.LabTestRecord.article_id).order_by(desc('count')).limit(10).all()

        results = []
        for row in query:
            raw_article = row.article_id
            article = "Unknown" if not raw_article or str(raw_article).strip() in ["", "None"] else str(raw_article).strip()
            
            results.append({
                "name": article,
                "value": row.count,
                "fill": "#6366f1"
            })
            
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/dashboard/charts/color-breakdown")
def get_color_breakdown(db: Session = Depends(get_db), filters: dict = Depends(get_filter_params)):
    try:
        query = db.query(
            models.LabTestRecord.color_name,
            func.count(models.LabTestRecord.id).label('count')
        )
        query = apply_dashboard_filters(query, filters)
        query = query.filter(
            models.LabTestRecord.color_name.isnot(None),
            models.LabTestRecord.color_name != '',
            models.LabTestRecord.color_name != 'None'
        ).group_by(
            models.LabTestRecord.color_name
        ).order_by(desc('count')).limit(10).all()

        results = []
        for row in query:
            results.append({
                "name": str(row.color_name).strip(),
                "value": row.count,
                "fill": "#2dd4bf"
            })
            
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/dashboard/charts/correction-attempts")
def get_correction_attempts(db: Session = Depends(get_db), filters: dict = Depends(get_filter_params)):
    try:
        query = db.query(
            models.LabTestRecord.correction_attempt,
            func.count(models.LabTestRecord.id).label('count')
        )
        query = apply_dashboard_filters(query, filters)
        query = query.group_by(models.LabTestRecord.correction_attempt).all()
        
        attempts = {}
        for row in query:
            try:
                val = float(row.correction_attempt) if row.correction_attempt is not None else 1.0
            except (ValueError, TypeError):
                val = 1.0
                
            val_int = int(val)
            attempts[val_int] = attempts.get(val_int, 0) + row.count
            
        def format_label(num):
            if num == 1: return "1st Attempt"
            if num == 2: return "2nd Attempt"
            if num == 3: return "3rd Attempt"
            return f"{num}th Attempt"
            
        sorted_attempts = sorted(attempts.items(), key=lambda x: x[0])
        colors = ["#6366f1", "#2dd4bf", "#f59e0b", "#ec4899", "#8b5cf6", "#3b82f6", "#14b8a6"]
        
        results = []
        for index, (attempt_num, count) in enumerate(sorted_attempts):
            results.append({
                "name": format_label(attempt_num),
                "value": count,
                "fill": colors[index % len(colors)]
            })
            
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/dashboard/charts/test-duration")
def get_test_duration(db: Session = Depends(get_db), filters: dict = Depends(get_filter_params)):
    try:
        query = db.query(
            models.LabTestRecord.lt_test_no,
            models.LabTestRecord.receive_date,
            models.LabTestRecord.finishdate
        ).filter(
            models.LabTestRecord.receive_date.isnot(None),
            models.LabTestRecord.finishdate.isnot(None)
        )
        query = apply_dashboard_filters(query, filters)
        query = query.all()
        
        data_points = []
        durations = []
        
        for row in query:
            try:
                duration = (row.finishdate - row.receive_date).total_seconds() / (24 * 3600)
                duration = max(0, duration) 
                
                durations.append(duration)
                data_points.append({
                    "name": str(row.lt_test_no).strip() if row.lt_test_no else "Unknown",
                    "duration": round(duration, 1)
                })
            except Exception:
                continue
                
        avg_dur = round(sum(durations) / len(durations), 1) if durations else 0
        median_dur = round(statistics.median(durations), 1) if durations else 0
        min_dur = round(min(durations), 1) if durations else 0
        max_dur = round(max(durations), 1) if durations else 0
        
        return {
            "stats": {
                "avg": avg_dur,
                "median": median_dur,
                "min": min_dur,
                "max": max_dur,
                "total_records": len(durations)
            },
            "chart_data": data_points
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/dashboard/details-table")
def get_details_table(
    page: int = 1, 
    limit: int = 100, 
    search: Optional[str] = None,
    status: Optional[str] = None, 
    section: Optional[str] = None, 
    group: Optional[str] = None, 
    article: Optional[str] = None, 
    color: Optional[str] = None, 
    attempt: Optional[str] = None, 
    reason: Optional[str] = None,
    db: Session = Depends(get_db), 
    filters: dict = Depends(get_filter_params)
):
    try:
        # 1. Start with the base query and apply global filters
        query = db.query(models.LabTestRecord)
        query = apply_dashboard_filters(query, filters)
        
        # 2. Apply the specific drill-down parameter clicked by the user
        if status and status.lower() != 'all':
            if status.lower() in ['passed', 'pass', 'rft']:
                query = query.filter(models.LabTestRecord.final_result_approve == 'Pass')
            elif status.lower() in ['failed', 'fail']:
                query = query.filter(models.LabTestRecord.final_result_approve == 'Fail')
            elif status.lower() == 'pending':
                query = query.filter(models.LabTestRecord.final_result_approve.is_(None))
                
        if section:
            # FIX 1: Added func.trim() to ignore hidden trailing spaces in the DB (e.g., "DY ")
            query = query.filter(func.lower(func.trim(models.LabTestRecord.app_section)) == section.lower())
        if group:
            # FIX 2: Removed faulty replace("_", " ") and added trim so "bulk_make" matches "Bulk_Make"
            query = query.filter(func.lower(func.trim(models.LabTestRecord.group_name)) == group.lower())
        if article:
            # Added func.trim() here as well for safety against dirty Excel data
            query = query.filter(func.lower(func.trim(models.LabTestRecord.article_id)) == article.lower())
        if color:
            # Added func.trim() here as well for safety against dirty Excel data
            query = query.filter(func.lower(func.trim(models.LabTestRecord.color_name)) == color.lower())
            
        if attempt:
            num_match = re.search(r'\d+', attempt)
            if num_match:
                query = query.filter(models.LabTestRecord.correction_attempt == num_match.group())
        if reason and reason.lower() != "unknown":
            query = query.filter(models.LabTestRecord.lt_result_comment.ilike(f"%{reason}%"))
            query = query.filter(models.LabTestRecord.final_result_approve == 'Fail')
            
        # 3. Apply the table's PO Number Search Bar
        if search:
            query = query.filter(models.LabTestRecord.salespo.ilike(f"%{search}%"))
            
        # 4. Calculate Summary Cards
        total_count = query.count()
        pass_count = query.filter(models.LabTestRecord.final_result_approve == 'Pass').count()
        fail_count = query.filter(models.LabTestRecord.final_result_approve == 'Fail').count()
        
        # 5. Fetch Paginated Records
        offset = (page - 1) * limit
        records = query.order_by(models.LabTestRecord.receive_date.desc()).offset(offset).limit(limit).all()
        
        return {
            "summary": {
                "total": total_count,
                "pass": pass_count,
                "fail": fail_count
            },
            "pagination": {
                "current_page": page,
                "total_pages": (total_count + limit - 1) // limit if total_count > 0 else 1,
                "total_records": total_count
            },
            "records": records
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/dashboard/export")
def export_details(
    format: str = "csv",
    filename: str = "Export",
    search: Optional[str] = None,
    status: Optional[str] = None, 
    section: Optional[str] = None, 
    group: Optional[str] = None, 
    article: Optional[str] = None, 
    color: Optional[str] = None, 
    attempt: Optional[str] = None, 
    reason: Optional[str] = None,
    db: Session = Depends(get_db), 
    filters: dict = Depends(get_filter_params)
):
    try:
        # 1. Apply Base & Global Filters
        query = db.query(models.LabTestRecord)
        query = apply_dashboard_filters(query, filters)
        
        # 2. Apply Specific Drill-Down Parameters
        if status and status.lower() != 'all':
            if status.lower() in ['passed', 'pass', 'rft']:
                query = query.filter(models.LabTestRecord.final_result_approve == 'Pass')
            elif status.lower() in ['failed', 'fail']:
                query = query.filter(models.LabTestRecord.final_result_approve == 'Fail')
            elif status.lower() == 'pending':
                query = query.filter(models.LabTestRecord.final_result_approve.is_(None))
                
        if section:
            query = query.filter(func.lower(func.trim(models.LabTestRecord.app_section)) == section.lower())
        if group:
            query = query.filter(func.lower(func.trim(models.LabTestRecord.group_name)) == group.lower())
        if article:
            query = query.filter(func.lower(func.trim(models.LabTestRecord.article_id)) == article.lower())
        if color:
            query = query.filter(func.lower(func.trim(models.LabTestRecord.color_name)) == color.lower())
            
        if attempt:
            num_match = re.search(r'\d+', attempt)
            if num_match:
                query = query.filter(models.LabTestRecord.correction_attempt == num_match.group())
        if reason and reason.lower() != "unknown":
            query = query.filter(models.LabTestRecord.lt_result_comment.ilike(f"%{reason}%"))
            query = query.filter(models.LabTestRecord.final_result_approve == 'Fail')
            
        # 3. Apply PO Number Search
        if search:
            query = query.filter(models.LabTestRecord.salespo.ilike(f"%{search}%"))
            
        # 4. Fetch ALL matching records
        records = query.order_by(models.LabTestRecord.receive_date.desc()).all()
        
        headers = ["Test No.", "Result", "PO Number", "Article", "Brand", "Color", "Group", "Section", "Test Date", "Comment"]

        # ---------------------------------------------------------
        # CSV GENERATION
        # ---------------------------------------------------------
        if format.lower() == "csv":
            stream = io.StringIO()
            writer = csv.writer(stream)
            writer.writerow(headers)
            
            for r in records:
                writer.writerow([
                    r.lt_test_no,
                    r.final_result_approve or "Pending",
                    r.salespo,
                    r.article_id,
                    r.brandid,
                    r.color_name,
                    r.group_name,
                    r.app_section,
                    r.labtest_date.strftime("%Y-%m-%d") if r.labtest_date else "-",
                    r.lt_result_comment
                ])
                
            stream.seek(0)
            response = StreamingResponse(iter([stream.getvalue()]), media_type="text/csv")
            response.headers["Content-Disposition"] = f"attachment; filename={filename}.csv"
            return response

        # ---------------------------------------------------------
        # PDF GENERATION
        # ---------------------------------------------------------
        elif format.lower() == "pdf":
            buffer = io.BytesIO()
            # Landscape A4 gives us more width for the 10 columns
            doc = SimpleDocTemplate(buffer, pagesize=landscape(A4), rightMargin=20, leftMargin=20, topMargin=20, bottomMargin=20)
            elements = []
            
            data = [headers]
            for r in records:
                data.append([
                    str(r.lt_test_no or "-")[:12], 
                    str(r.final_result_approve or "Pending"),
                    str(r.salespo or "-")[:12],
                    str(r.article_id or "-")[:12],
                    str(r.brandid or "-")[:8],
                    str(r.color_name or "-")[:10],
                    str(r.group_name or "-")[:10],
                    str(r.app_section or "-"),
                    r.labtest_date.strftime("%Y-%m-%d") if r.labtest_date else "-",
                    str(r.lt_result_comment or "-")[:25] # Truncated so the PDF table doesn't break
                ])
            
            # Style the table
            table = Table(data)
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1e293b")),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 8),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
                ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor("#f8fafc")),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ]))
            
            elements.append(table)
            doc.build(elements)
            
            buffer.seek(0)
            response = StreamingResponse(iter([buffer.getvalue()]), media_type="application/pdf")
            response.headers["Content-Disposition"] = f"attachment; filename={filename}.pdf"
            return response

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))