from fastapi import APIRouter, UploadFile, File
router = APIRouter()

@router.post("/analyze")
async def analyze_dashboard_image(file: UploadFile = File(...)):
    # TODO: Gemini API 연동 (계기판 OCR)
    # 현재는 목업 응답
    return {"odo_km_detected": 65432, "note": "Mocked until Gemini integration"}
