from sqlalchemy import Column, Integer, String, Float, DateTime
from database import Base

class LabTestRecord(Base):
    __tablename__ = "lab_test_records"

    # Primary Key
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    
    # Core Dates & Section Details
    appdate = Column(DateTime, nullable=True)
    app_section = Column(String, nullable=True)
    labtest_date = Column(DateTime, nullable=True)
    receive_date = Column(DateTime, nullable=True)
    finishdate = Column(DateTime, nullable=True)
    
    # Group & Order Metadata
    group_name = Column(String, name="group", nullable=True) 
    lt_test_no = Column(String, index=True, nullable=True)
    brandid = Column(String, nullable=True)
    ordertype = Column(String, nullable=True)
    salespo = Column(String, nullable=True)
    plannoid = Column(String, nullable=True)
    custcode = Column(String, nullable=True)
    article_id = Column(String, nullable=True)
    
    # Color & Rework Information
    color_code = Column(String, nullable=True)
    color_name = Column(String, nullable=True)
    re_work = Column(String, nullable=True)
    re_work_remark = Column(String, nullable=True)
    cancel_date = Column(DateTime, nullable=True)
    
    # Test Results & Approvals
    lt_remark = Column(String, nullable=True)
    lt_result = Column(String, nullable=True)
    lt_result_comment = Column(String, nullable=True)
    final_result_approve = Column(String, nullable=True)
    final_approved_by = Column(String, nullable=True)
    
    # Failure Diagnostics & Attempts
    failgroup = Column(String, nullable=True)
    fmin = Column(Float, nullable=True)
    failerid = Column(String, nullable=True)
    failer_name = Column(String, nullable=True)
    failer_remark = Column(String, nullable=True)
    failer_no = Column(Float, nullable=True)
    correction_attempt = Column(Float, name="Correction Attempt", nullable=True)