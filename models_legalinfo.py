from sqlalchemy import (
    Column, Integer, String, Date, Boolean, Text,
    ForeignKey, TIMESTAMP, func
)
from sqlalchemy.orm import relationship
from db.session import Base


class LegalInfo(Base):
    '''
    법적 관리 패널 데이터 모델
    보험 / 자동차세 / 정기검사 / 등록정보 통합 관리
    '''
    __tablename__ = "legal_info"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False)

    # 보험 관련
    insurance_company = Column(String(100), nullable=True)
    insurance_number = Column(String(100), nullable=True)
    insurance_expiry = Column(Date, nullable=True)
    insurance_fee = Column(Integer, nullable=True)

    # 자동차세 관련
    tax_year = Column(Integer, nullable=True)
    tax_amount = Column(Integer, nullable=True)
    tax_due_date = Column(Date, nullable=True)
    tax_paid = Column(Boolean, default=False)

    # 정기검사 관련
    inspection_center = Column(String(100), nullable=True)
    inspection_date = Column(Date, nullable=True)
    next_inspection_date = Column(Date, nullable=True)
    inspection_result = Column(String(50), nullable=True)

    # 차량 등록 관련
    registration_number = Column(String(100), nullable=True)
    registration_office = Column(String(100), nullable=True)
    registration_date = Column(Date, nullable=True)
    registration_type = Column(String(50), nullable=True)

    # 공통 필드
    memo = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())


class LegalNotification(Base):
    '''
    법적 관리 알림 테이블
    (기존 notifications 구조와 동일하게 구성)
    '''
    __tablename__ = "legal_notifications"

    id = Column(Integer, primary_key=True, index=True)
    legal_id = Column(Integer, ForeignKey("legal_info.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False)

    type = Column(String(50), nullable=False)  # 예: insurance, tax, inspection
    due_date = Column(Date, nullable=True)
    sent_at = Column(TIMESTAMP, nullable=True)
    enabled = Column(Boolean, default=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
