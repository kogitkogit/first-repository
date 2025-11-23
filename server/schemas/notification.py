from pydantic import BaseModel

class NotificationUpdateSchema(BaseModel):
    user_id: int
    vehicle_id: int
    type: str
    enabled: bool