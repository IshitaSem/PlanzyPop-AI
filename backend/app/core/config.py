"""Application configuration loaded from environment variables."""

import os
from pathlib import Path
from typing import List
from dotenv import load_dotenv

# Locate and load backend .env file if it exists
BASE_DIR = Path(__file__).resolve().parent.parent.parent
env_path = BASE_DIR / ".env"
load_dotenv(dotenv_path=env_path)


class Settings:
    """Application settings class."""

    APP_NAME: str = "PlanzyPop AI"
    APP_TAGLINE: str = "Your vibe. Your plan. Your party."
    APP_VERSION: str = "1.0.0"

    # Gemini configuration
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "").strip()
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3-flash-preview").strip()

    # CORS configuration
    FRONTEND_ORIGINS_RAW: str = os.getenv(
        "FRONTEND_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8443,http://127.0.0.1:8443",
    )

    @property
    def allowed_origins(self) -> List[str]:
        """Return list of allowed CORS origins."""
        origins = [origin.strip() for origin in self.FRONTEND_ORIGINS_RAW.split(",") if origin.strip()]
        return origins or ["*"]

    @property
    def is_gemini_configured(self) -> bool:
        """Return True if a valid Gemini API key is configured."""
        if not self.GEMINI_API_KEY:
            return False
        # Check against common placeholder values
        placeholders = {"your_gemini_api_key_here", "placeholder", "none", "your_key"}
        return self.GEMINI_API_KEY.lower() not in placeholders


settings = Settings()
