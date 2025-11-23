from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from db.session import get_db
from models.ConsumableItem import Consumable, ConsumableItem
from schemas.consumables import Consumable as ConsumableSchema, ConsumableCreate, BulkDeleteRequest, ConsumableItemCreate
from core.security import get_current_user_id

router = APIRouter()

# -----------------------------
# History APIs (public.consumables)
# -----------------------------

@router.post("/add", response_model=ConsumableSchema)
def add_consumable(
    item: ConsumableCreate,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)  # JWT에서 추출
):
    data = item.dict()
    data["user_id"] = current_user_id   # 세션에 담지 않고 호출자 기반으로 보정
    db_item = Consumable(**data)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)

    # consumable_items 테이블 최신 교체 정보 업데이트
    s = (
        db.query(ConsumableItem)
        .filter(
            ConsumableItem.user_id == current_user_id,
            ConsumableItem.vehicle_id == item.vehicle_id,
            ConsumableItem.category == item.category,
            ConsumableItem.kind == item.kind,
        )
        .first()
    )
    if s:
        if item.date:
            s.last_date = item.date
        if item.odo_km is not None:
            s.last_odo_km = item.odo_km
        s.updated_at = datetime.utcnow()
        db.add(s)
        db.commit()

    return db_item

@router.get("/list", response_model=List[ConsumableSchema])
def list_consumables(vehicleId: int, db: Session = Depends(get_db), current_user_id: int = Depends(get_current_user_id)):
    return db.query(Consumable).filter(Consumable.vehicle_id == vehicleId, Consumable.user_id == current_user_id).all()

@router.get("/search", response_model=List[ConsumableSchema])
def search_consumables(
    vehicleId: int,
    category: str,
    kind: Optional[str] = None,
    sort: Optional[str] = "date",
    order: Optional[str] = "desc",
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
):
    q = db.query(Consumable).filter(
        Consumable.vehicle_id == vehicleId,
        Consumable.category == category,
        Consumable.user_id == current_user_id,
    )
    if kind:
        q = q.filter(Consumable.kind == kind)
    if sort == "date":
        q = q.order_by(Consumable.date.desc() if order == "desc" else Consumable.date.asc())
    elif sort == "odo":
        q = q.order_by(Consumable.odo_km.desc() if order == "desc" else Consumable.odo_km.asc())
    elif sort == "id":
        q = q.order_by(Consumable.id.desc() if order == "desc" else Consumable.id.asc())
    return q.all()

@router.get("/latest", response_model=ConsumableSchema)
def get_latest_consumable(vehicleId: int, kind: str, db: Session = Depends(get_db)):
    item = db.query(Consumable).filter(
        Consumable.vehicle_id == vehicleId,
        Consumable.kind == kind
    ).order_by(Consumable.date.desc()).first()
    if not item:
        raise HTTPException(status_code=404, detail="해당 항목이 존재하지 않습니다.")
    return item

@router.delete("/{consumable_id}")
def delete_consumable(consumable_id: int, db: Session = Depends(get_db)):
    row = db.query(Consumable).get(consumable_id)
    if not row:
        raise HTTPException(status_code=404, detail="해당 기록이 존재하지 않습니다.")
    db.delete(row)
    db.commit()
    return {"ok": True}

@router.post("/bulk-delete")
def bulk_delete_items(req: BulkDeleteRequest, db: Session = Depends(get_db)):
    if not req.ids:
        raise HTTPException(status_code=400, detail="ids가 비어 있습니다.")
    rows = db.query(Consumable).filter(Consumable.id.in_(req.ids)).all()
    if not rows:
        raise HTTPException(status_code=404, detail="삭제할 데이터를 찾지 못했습니다.")
    for row in rows:
        db.delete(row)
    db.commit()
    return {"ok": True, "deleted": len(rows)}

# -----------------------------
# Settings APIs (public.consumable_items)
# -----------------------------

DEFAULT_OIL_ITEMS = [
    {"kind": "엔진오일", "mode": "distance", "cycle_km": 5000, "cycle_months": 6},
    {"kind": "미션오일", "mode": "distance", "cycle_km": 40000, "cycle_months": 24},
    {"kind": "브레이크액", "mode": "time", "cycle_km": 40000, "cycle_months": 24},
    {"kind": "부동액", "mode": "time", "cycle_km": 40000, "cycle_months": 24},
]

DEFAULT_FILTER_ITEMS = [
    {"kind": "엔진오일 필터", "mode": "distance", "cycle_km": 5000, "cycle_months": 6},
    {"kind": "에어 필터", "mode": "distance", "cycle_km": 15000, "cycle_months": 12},
    {"kind": "캐빈 필터", "mode": "time", "cycle_km": 0, "cycle_months": 12},
    {"kind": "연료 필터(가솔린)", "mode": "distance", "cycle_km": 40000, "cycle_months": 24},
    {"kind": "연료 필터(디젤)", "mode": "distance", "cycle_km": 20000, "cycle_months": 12},
]

DEFAULT_CONSUMABLE_ITEMS = [
    {"kind": "브레이크 패드", "mode": "distance", "cycle_km": 40000, "cycle_months": 36},
    {"kind": "브레이크 디스크(로터)", "mode": "distance", "cycle_km": 80000, "cycle_months": 60},
    {"kind": "배터리", "mode": "time", "cycle_km": 0, "cycle_months": 48},
    {"kind": "와이퍼 블레이드", "mode": "distance", "cycle_km": 60000, "cycle_months": 48},
    {"kind": "에어컨 필터", "mode": "time", "cycle_km": 0, "cycle_months": 12},
    {"kind": "스파크 플러그", "mode": "distance", "cycle_km": 80000, "cycle_months": 48},
    {"kind": "타이밍 벨트", "mode": "distance", "cycle_km": 100000, "cycle_months": 60},
]


def _ensure_seed(db: Session, user_id: int, vehicle_id: int, category: str):
    if category == "오일":
        defaults = DEFAULT_OIL_ITEMS
    elif category == "필터":
        defaults = DEFAULT_FILTER_ITEMS
    elif category == "소모품":
        defaults = DEFAULT_CONSUMABLE_ITEMS
    else:
        defaults = []

    exist = (
        db.query(ConsumableItem)
        .filter(
            ConsumableItem.user_id == user_id,
            ConsumableItem.vehicle_id == vehicle_id,
            ConsumableItem.category == category,
        )
        .count()
    )
    if exist == 0 and defaults:
        now = datetime.utcnow()
        for d in defaults:
            db.add(
                ConsumableItem(
                    user_id=user_id,
                    vehicle_id=vehicle_id,
                    category=category,
                    kind=d["kind"],
                    mode=d["mode"],
                    cycle_km=d.get("cycle_km"),
                    cycle_months=d.get("cycle_months"),
                    created_at=now,
                    updated_at=now,
                )
            )
        db.commit()

@router.get("/items")
def get_items(
    vehicleId: int,
    category: str,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
):
    _ensure_seed(db, current_user_id, vehicleId, category)

    rows = (
        db.query(ConsumableItem)
        .filter(
            ConsumableItem.user_id == current_user_id,
            ConsumableItem.vehicle_id == vehicleId,
            ConsumableItem.category == category,
        )
        .order_by(ConsumableItem.id.asc())
        .all()
    )
    return [
        {
            "id": r.id,
            "kind": r.kind,
            "mode": r.mode or "distance",
            "cycleKm": r.cycle_km,
            "cycleMonths": r.cycle_months,
            "lastOdo": r.last_odo_km,
            "lastDate": r.last_date.isoformat() if r.last_date else None,
        }
        for r in rows
    ]

@router.put("/items/{item_id}")
def update_item(item_id: int, payload: dict, db: Session = Depends(get_db)):
    row = db.query(ConsumableItem).get(item_id)
    if not row:
        raise HTTPException(status_code=404, detail="해당 항목을 찾지 못했습니다.")
    for k in ["kind", "category", "mode", "cycle_km", "cycle_months", "last_odo_km", "last_date", "cost", "memo"]:
        if k in payload:
            setattr(row, k, payload[k])
    row.updated_at = datetime.utcnow()
    db.add(row)
    db.commit()
    return {"ok": True}

@router.delete("/items/{item_id}")
def delete_item(item_id: int, db: Session = Depends(get_db), current_user_id: int = Depends(get_current_user_id)):
    row = db.query(ConsumableItem).get(item_id)
    if not row:
        raise HTTPException(status_code=404, detail="해당 항목을 찾지 못했습니다.")
    db.delete(row)
    db.commit()
    return {"ok": True}

@router.post("/items")
def create_item(
    item: ConsumableItemCreate,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
):
    existing = (
        db.query(ConsumableItem)
        .filter(
            ConsumableItem.user_id == current_user_id,
            ConsumableItem.vehicle_id == item.vehicle_id,
            ConsumableItem.category == item.category,
            ConsumableItem.kind == item.kind,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="같은 항목이 이미 존재합니다.")

    now = datetime.utcnow()
    db_item = ConsumableItem(
        user_id=current_user_id,
        vehicle_id=item.vehicle_id,
        category=item.category or "오일",
        kind=item.kind,
        mode=item.mode or "distance",
        cycle_km=item.cycle_km,
        cycle_months=item.cycle_months,
        last_odo_km=item.last_odo_km,
        last_date=item.last_date,
        created_at=now,
        updated_at=now,
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.post("/items/reset")
def reset_items(
    vehicleId: int,
    category: str,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
):
    db.query(ConsumableItem).filter(
        ConsumableItem.user_id == current_user_id,
        ConsumableItem.vehicle_id == vehicleId,
        ConsumableItem.category == category,
    ).delete()
    db.commit()

    if category == "오일":
        defaults = DEFAULT_OIL_ITEMS
    elif category == "필터":
        defaults = DEFAULT_FILTER_ITEMS
    elif category == "소모품":
        defaults = DEFAULT_CONSUMABLE_ITEMS
    else:
        defaults = []

    now = datetime.utcnow()
    for base in defaults:
        db_item = ConsumableItem(
            user_id=current_user_id,
            vehicle_id=vehicleId,
            category=category,
            kind=base["kind"],
            mode=base["mode"],
            cycle_km=base.get("cycle_km"),
            cycle_months=base.get("cycle_months"),
            created_at=now,
            updated_at=now,
        )
        db.add(db_item)
    db.commit()

    return {"ok": True, "message": f"{category} 기본 항목으로 초기화되었습니다."}
