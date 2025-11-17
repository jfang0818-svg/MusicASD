"""
Application Configuration
"""
import os
from typing import List
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Settings:
    """Application settings"""

    # Application Info
    APP_NAME: str = "musicASD MCP Server"
    APP_VERSION: str = "2.0.0"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

    # Server Configuration
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    RELOAD: bool = os.getenv("RELOAD", "false").lower() == "true"

    # CORS Settings
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",  # Alternative port
    ]

    # Add additional origins from environment
    extra_origins = os.getenv("EXTRA_ORIGINS", "")
    if extra_origins:
        ALLOWED_ORIGINS.extend(extra_origins.split(","))

    # Database Configuration
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./data/session_logs.db")
    DATABASE_PATH: Path = Path("data/session_logs.db")

    # Audio Configuration
    AUDIO_SAMPLE_RATE: int = int(os.getenv("AUDIO_SAMPLE_RATE", "22050"))
    AUDIO_BUFFER_SIZE: int = int(os.getenv("AUDIO_BUFFER_SIZE", "512"))
    DEFAULT_VOLUME: float = float(os.getenv("DEFAULT_VOLUME", "0.7"))

    # File Paths
    DATA_DIR: Path = Path(os.getenv("DATA_DIR", "data"))
    LOGS_DIR: Path = Path(os.getenv("LOGS_DIR", "logs"))
    ASSETS_DIR: Path = Path(os.getenv("ASSETS_DIR", "assets"))
    MUSIC_DIR: Path = ASSETS_DIR / "music"
    GENERATED_MUSIC_DIR: Path = MUSIC_DIR / "generated"

    # Music Library Paths (check parent directory too)
    PARENT_MUSIC_DIR: Path = Path("../assets/music")

    # Session Configuration
    SESSION_TIMEOUT_MINUTES: int = int(os.getenv("SESSION_TIMEOUT_MINUTES", "60"))
    MAX_SESSION_LOGS: int = int(os.getenv("MAX_SESSION_LOGS", "1000"))

    # OpenAI Configuration (for GPT integration)
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    GPT_MODEL: str = os.getenv("GPT_MODEL", "gpt-5.1")  # Updated to GPT-5.1 (Nov 2025)
    GPT_TEMPERATURE: float = float(os.getenv("GPT_TEMPERATURE", "0.7"))

    # MCP Server Configuration
    MCP_ENABLED: bool = os.getenv("MCP_ENABLED", "true").lower() == "true"
    MCP_TOOLS: List[str] = ["engagement.read", "music.play", "session.log"]

    # MediaPipe Configuration
    MEDIAPIPE_ENABLED: bool = os.getenv("MEDIAPIPE_ENABLED", "false").lower() == "true"
    POSE_DETECTION_CONFIDENCE: float = float(os.getenv("POSE_DETECTION_CONFIDENCE", "0.5"))

    # Logging Configuration
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    LOG_FORMAT: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "dev-jwt-secret-change-in-production")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_EXPIRATION_MINUTES: int = int(os.getenv("JWT_EXPIRATION_MINUTES", "10080"))  # 7 days

    # Email Configuration (Zoho SMTP)
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.zoho.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    FROM_EMAIL: str = os.getenv("FROM_EMAIL", "")
    FROM_NAME: str = os.getenv("FROM_NAME", "musicASD")

    # Azure Blob Storage Configuration
    AZURE_STORAGE_CONNECTION_STRING: str = os.getenv("AZURE_STORAGE_CONNECTION_STRING", "")
    AZURE_CONTAINER_NAME: str = os.getenv("AZURE_CONTAINER_NAME", "musicasd-container")
    AZURE_USE_EMULATOR: bool = os.getenv("AZURE_USE_EMULATOR", "false").lower() == "true"

    # Redis Configuration
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    REDIS_MAX_CONNECTIONS: int = int(os.getenv("REDIS_MAX_CONNECTIONS", "10"))
    REDIS_DECODE_RESPONSES: bool = os.getenv("REDIS_DECODE_RESPONSES", "true").lower() == "true"

    # Feature Flags
    ENABLE_ANALYTICS: bool = os.getenv("ENABLE_ANALYTICS", "true").lower() == "true"
    ENABLE_MUSIC_GENERATION: bool = os.getenv("ENABLE_MUSIC_GENERATION", "true").lower() == "true"
    ENABLE_FILE_UPLOAD: bool = os.getenv("ENABLE_FILE_UPLOAD", "true").lower() == "true"
    ENABLE_GPT_SUGGESTIONS: bool = os.getenv("ENABLE_GPT_SUGGESTIONS", "false").lower() == "true"

    # Limits
    MAX_UPLOAD_SIZE: int = int(os.getenv("MAX_UPLOAD_SIZE", "10485760"))  # 10MB
    MAX_GENERATED_DURATION: float = float(os.getenv("MAX_GENERATED_DURATION", "30.0"))  # seconds

    def __init__(self):
        """Initialize and validate settings"""
        self._create_directories()
        self._validate_settings()

    def _create_directories(self):
        """Ensure required directories exist"""
        directories = [
            self.DATA_DIR,
            self.LOGS_DIR,
            self.ASSETS_DIR,
            self.MUSIC_DIR,
            self.GENERATED_MUSIC_DIR,
            self.MUSIC_DIR / "calm",
            self.MUSIC_DIR / "happy",
            self.MUSIC_DIR / "energetic"
        ]

        for directory in directories:
            directory.mkdir(parents=True, exist_ok=True)

    def _validate_settings(self):
        """Validate critical settings"""
        if self.ENVIRONMENT == "production":
            if self.SECRET_KEY == "dev-secret-key-change-in-production":
                raise ValueError("SECRET_KEY must be changed in production!")

            if not self.OPENAI_API_KEY and self.ENABLE_GPT_SUGGESTIONS:
                print("Warning: GPT suggestions enabled but OPENAI_API_KEY not set")

    def get_music_styles(self) -> List[str]:
        """Get available music styles"""
        return ["calm", "happy", "energetic"]

    def get_engagement_levels(self) -> List[str]:
        """Get valid engagement levels"""
        return ["LOW", "MED", "HIGH"]

    def to_dict(self) -> dict:
        """Convert settings to dictionary (for debugging)"""
        return {
            "APP_NAME": self.APP_NAME,
            "APP_VERSION": self.APP_VERSION,
            "ENVIRONMENT": self.ENVIRONMENT,
            "HOST": self.HOST,
            "PORT": self.PORT,
            "DATABASE_URL": self.DATABASE_URL,
            "AUDIO_SAMPLE_RATE": self.AUDIO_SAMPLE_RATE,
            "MCP_ENABLED": self.MCP_ENABLED,
            "ENABLE_GPT_SUGGESTIONS": self.ENABLE_GPT_SUGGESTIONS,
            "LOG_LEVEL": self.LOG_LEVEL
        }

# Create singleton instance
settings = Settings()