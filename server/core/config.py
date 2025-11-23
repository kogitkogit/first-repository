from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    PROJECT_NAME: str = "CarCare"

    # DB 연결
    DATABASE_URL: str = "postgresql+psycopg2://carcare:carcare@localhost:5433/carcare"

    JWT_SECRET: str = "dev_secret"
    JWT_ALG: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60


settings = Settings()