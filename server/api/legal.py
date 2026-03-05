from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.auth import get_current_user
from core.ownership import ensure_vehicle_owned
from db.session import get_db
from models.User import User
from models.legalinfo import LegalInfo
from schemas.legalinfo import (
    LegalInfoCreate,
    LegalInfoResponse,
    LegalInfoUpdate,
    LegalSummaryItem,
    LegalSummaryResponse,
)

router = APIRouter(tags=["legal"])


@router.get("/list", response_model=List[LegalInfoResponse])
def list_legal(
    vehicleId: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    vehicle = ensure_vehicle_owned(vehicleId, current_user, db)
    records = (
        db.query(LegalInfo)
        .filter(
            LegalInfo.vehicle_id == vehicle.id,
            LegalInfo.user_id == current_user.id,
        )
        .all()
    )
    return records


@router.post("/add", response_model=LegalInfoResponse)
def add_legal(
    info: LegalInfoCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    vehicle = ensure_vehicle_owned(info.vehicle_id, current_user, db)
    payload = info.dict()
    payload["user_id"] = current_user.id
    payload["vehicle_id"] = vehicle.id

    new_record = LegalInfo(**payload)
    db.add(new_record)
    db.commit()
    db.refresh(new_record)
    return new_record


@router.put("/update/{id}", response_model=LegalInfoResponse)
def update_legal(
    id: int,
    info: LegalInfoUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = (
        db.query(LegalInfo)
        .filter(LegalInfo.id == id, LegalInfo.user_id == current_user.id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    vehicle = ensure_vehicle_owned(info.vehicle_id, current_user, db)
    updates = info.dict(exclude_unset=True)
    updates.pop("id", None)
    updates.pop("user_id", None)
    updates["vehicle_id"] = vehicle.id
    for key, value in updates.items():
        setattr(record, key, value)
    record.user_id = current_user.id

    db.commit()
    db.refresh(record)
    return record


@router.delete("/delete/{id}")
def delete_legal(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = (
        db.query(LegalInfo)
        .filter(LegalInfo.id == id, LegalInfo.user_id == current_user.id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    db.delete(record)
    db.commit()
    return {"message": "Deleted successfully"}


def _serialize_date(value):
    if not value:
        return None
    try:
        return value.isoformat()
    except AttributeError:
        return str(value)


def _latest(record_getter, key):
    records = [r for r in record_getter if getattr(r, key, None)]
    if not records:
        return None
    return max(records, key=lambda r: getattr(r, key))


@router.get("/summary", response_model=LegalSummaryResponse)
def legal_summary(
    vehicleId: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    vehicle = ensure_vehicle_owned(vehicleId, current_user, db)
    records = (
        db.query(LegalInfo)
        .filter(
            LegalInfo.vehicle_id == vehicle.id,
            LegalInfo.user_id == current_user.id,
        )
        .all()
    )
    if not records:
        return LegalSummaryResponse()

    insurance_record = _latest(records, "insurance_expiry")
    inspection_record = _latest(records, "inspection_date")
    tax_record = _latest(records, "tax_due_date")

    insurance = None
    if insurance_record:
        insurance = LegalSummaryItem(
            label=insurance_record.insurance_company,
            date=_serialize_date(insurance_record.insurance_expiry),
            amount=insurance_record.insurance_fee,
            memo=insurance_record.memo,
        )

    inspection = None
    if inspection_record:
        inspection = LegalSummaryItem(
            label=inspection_record.inspection_center,
            date=_serialize_date(inspection_record.inspection_date),
            next_date=_serialize_date(inspection_record.next_inspection_date),
            memo=inspection_record.inspection_result or inspection_record.memo,
        )

    tax = None
    if tax_record:
        tax = LegalSummaryItem(
            label=str(tax_record.tax_year) if tax_record.tax_year else None,
            date=_serialize_date(tax_record.tax_due_date),
            amount=tax_record.tax_amount,
            paid=tax_record.tax_paid,
            memo=tax_record.memo,
        )

    return LegalSummaryResponse(insurance=insurance, inspection=inspection, tax=tax)
