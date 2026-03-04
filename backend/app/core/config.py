from pydantic_settings import BaseSettings
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    app_name: str = "Mechela"
    db_url: str = f"sqlite+aiosqlite:///{BASE_DIR}/mechela.db"
    upload_dir: Path = BASE_DIR / "uploads"

    class Config:
        env_file = ".env"


settings = Settings()
settings.upload_dir.mkdir(exist_ok=True)
