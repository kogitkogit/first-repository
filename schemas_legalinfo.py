from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime


class LegalInfoBase(BaseModel):
    user_id: int
    vehicle_id: int
    insurance_company: Optional[str] = None
    insurance_number: Optional[str] = None
    insurance_expiry: Optional[date] = None
    insurance_fee: Optional[int] = None
    tax_year: Optional[int] = None
    tax_amount: Optional[int] = None
    tax_due_date: Optional[date] = None
    tax_paid: Optional[bool] = None
    inspection_center: Optional[str] = None
    inspection_date: Optional[date] = None
    next_inspection_date: Optional[date] = None
    inspection_result: Optional[str] = None
    registration_number: Optional[str] = None
    registration_office: Optional[str] = None
    registration_date: Optional[date] = None
    registration_type: Optional[str] = None
    memo: Optional[str] = None


class LegalInfoCreate(LegalInfoBase):
    pass


class LegalInfoUpdate(LegalInfoBase):
    id: int


class LegalInfoResponse(LegalInfoBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True
