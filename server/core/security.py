from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import jwt
from core.config import settings
from jose import jwt, JWTError
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
# 1) 토큰 스킴 정의 (로그인 토큰 발급 엔드포인트 경로에 맞춰 수정)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# 2) 시크릿/알고리즘 설정 (config에 이미 존재하는 키 사용)
SECRET_KEY = getattr(settings, "JWT_SECRET", None) or settings.SECRET_KEY
ALGORITHM = getattr(settings, "JWT_ALG", "HS256")

def hash_password(pw: str) -> str:
    return pwd_context.hash(pw)

def verify_password(pw: str, hashed: str) -> bool:
    return pwd_context.verify(pw, hashed)

def create_token(sub: str, minutes: int = 60*24) -> str:
    now = datetime.utcnow()
    payload = {"sub": sub, "iat": now, "exp": now + timedelta(minutes=minutes)}
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALG)

def get_current_user_id(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    return int(user_id)
