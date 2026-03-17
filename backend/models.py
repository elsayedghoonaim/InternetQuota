from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field

# --- Database Models (Internal) ---
class AccountDB(BaseModel):
    """How the account looks inside MongoDB"""
    id: Optional[str] = Field(None, alias="_id")
    type: str
    identifier: str
    password: str
    name: Optional[str] = None      
    isp_name: Optional[str] = None  
    
    offer_name: Optional[str] = None
    total_gb: Optional[float] = None
    used_gb: Optional[float] = None
    remain_gb: Optional[float] = None
    usage_percent: Optional[float] = None
    expires_on: Optional[str] = None
    last_check: Optional[datetime] = None
    
    # --- NEW FIELD ---
    low_quota_notified: bool = Field(default=False) 

class QuotaLog(BaseModel):
    account_identifier: str
    remain_gb: float
    used_gb: float
    checked_at: datetime = Field(default_factory=datetime.utcnow)

# --- API Request/Response Schemas (External) ---
class AccountCreate(BaseModel):
    type: str
    identifier: str
    password: str
    name: Optional[str] = None

class AccountResponse(BaseModel):
    id: str
    type: str
    identifier: str
    name: Optional[str] = None
    isp_name: Optional[str] = None
    offer_name: Optional[str] = None
    total_gb: Optional[float] = None
    used_gb: Optional[float] = None
    remain_gb: Optional[float] = None
    expires_on: Optional[str] = None
    last_check: Optional[datetime] = None

class MonthlyStatistics(BaseModel):
    account_identifier: str
    account_name: Optional[str] = None
    account_type: Optional[str] = None
    year: int
    month: int
    period: str
    avg_daily_usage_gb: float = 0.0
    total_consumed_gb: float = 0.0
    peak_usage_gb: float = 0.0
    peak_usage_date: Optional[str] = None
    min_remaining_gb: float = 0.0
    avg_remaining_gb: float = 0.0
    current_plan_gb: float = 0.0
    recommended_quota_gb: float = 0.0
    recommendation: str = "GOOD"
    data_points: int = 0
    data_coverage_days: int = 0
    total_days_in_month: int = 0
    computed_at: Optional[datetime] = None


class PipelineResult(BaseModel):
    stats_generated: int = 0
    old_logs_deleted: int = 0
    old_stats_deleted: int = 0