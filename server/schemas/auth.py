from pydantic import BaseModel

class RegisterIn(BaseModel):
    username: str
    password: str

class LoginIn(BaseModel):
    username: str
    password: str

class ResetPasswordIn(BaseModel):
    username: str
    current_password: str
    new_password: str


class DeleteAccountIn(BaseModel):
    current_password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    username: str
    account_type: str
