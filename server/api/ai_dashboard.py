from fastapi import APIRouter, File, HTTPException, UploadFile

router = APIRouter()


@router.post("/analyze")
async def analyze_dashboard_image(file: UploadFile = File(...)):
    raise HTTPException(status_code=503, detail="계기판 OCR 기능은 현재 준비 중입니다.")
