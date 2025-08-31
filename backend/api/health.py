"""
Health Check API endpoints
"""
from fastapi import APIRouter
from datetime import datetime
import pygame
import sqlite3
import os
import logging
from pathlib import Path

logger = logging.getLogger(__name__)
router = APIRouter(tags=["health"])

def get_state():
    from main import state
    return state

@router.get("/health")
def health_check():
    """Health check endpoint"""
    state = get_state()

    # Check various system components
    checks = {
        "api": "healthy",
        "pygame": "unknown",
        "database": "unknown",
        "files": "unknown"
    }

    # Check pygame
    try:
        pygame_initialized = pygame.mixer.get_init() is not None
        checks["pygame"] = "healthy" if pygame_initialized else "not_initialized"
    except Exception as e:
        checks["pygame"] = f"error: {str(e)}"

    # Check database
    try:
        conn = sqlite3.connect('data/session_logs.db')
        c = conn.cursor()
        c.execute("SELECT COUNT(*) FROM logs")
        log_count = c.fetchone()[0]
        conn.close()
        checks["database"] = "healthy"
    except Exception as e:
        checks["database"] = f"error: {str(e)}"
        log_count = 0

    # Check file system
    try:
        data_dir = Path("data")
        assets_dir = Path("assets/music")
        checks["files"] = "healthy" if (data_dir.exists() and assets_dir.exists()) else "missing_directories"
    except Exception as e:
        checks["files"] = f"error: {str(e)}"

    # Overall status
    overall_status = "healthy" if all(v == "healthy" for v in checks.values()) else "degraded"

    return {
        "status": overall_status,
        "checks": checks,
        "session_active": state.session_active,
        "music_files_loaded": sum(len(files) for files in state.music_library.values()),
        "generated_tones": len(state.generated_tones),
        "total_logs_in_db": log_count,
        "timestamp": datetime.now().isoformat()
    }

@router.get("/health/simple")
def simple_health_check():
    """Simple health check for load balancers"""
    return {"status": "ok"}

@router.get("/health/detailed")
def detailed_health_check():
    """Detailed health check with all system information"""
    state = get_state()

    # Gather detailed information
    details = {
        "timestamp": datetime.now().isoformat(),
        "api": {
            "status": "healthy",
            "version": "2.0.0",
            "environment": os.getenv("ENV", "development")
        },
        "audio": {
            "pygame_initialized": False,
            "mixer_channels": 0,
            "current_music": state.current_music,
            "music_playing": state.music_playing
        },
        "session": {
            "active": state.session_active,
            "session_id": state.session_id,
            "log_count": len(state.logs),
            "engagement_level": state.engagement_level
        },
        "storage": {
            "database": {},
            "files": {},
            "music_library": {}
        },
        "camera": {
            "enabled": state.camera_enabled
        }
    }

    # Check pygame details
    try:
        if pygame.mixer.get_init():
            details["audio"]["pygame_initialized"] = True
            details["audio"]["mixer_channels"] = pygame.mixer.get_num_channels()
            details["audio"]["sample_rate"] = pygame.mixer.get_init()[0]
            details["audio"]["buffer_size"] = pygame.mixer.get_init()[3]
    except Exception as e:
        details["audio"]["error"] = str(e)

    # Check database details
    try:
        conn = sqlite3.connect('data/session_logs.db')
        c = conn.cursor()

        # Get table info
        c.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row[0] for row in c.fetchall()]

        # Get counts
        counts = {}
        for table in tables:
            c.execute(f"SELECT COUNT(*) FROM {table}")
            counts[table] = c.fetchone()[0]

        # Get database file size
        db_path = Path('data/session_logs.db')
        db_size = db_path.stat().st_size if db_path.exists() else 0

        details["storage"]["database"] = {
            "status": "healthy",
            "tables": tables,
            "record_counts": counts,
            "size_bytes": db_size
        }

        conn.close()
    except Exception as e:
        details["storage"]["database"]["error"] = str(e)

    # Check file storage
    try:
        data_dir = Path("data")
        csv_files = list(data_dir.glob("session_*.csv")) if data_dir.exists() else []

        details["storage"]["files"] = {
            "data_directory_exists": data_dir.exists(),
            "csv_session_files": len(csv_files),
            "total_csv_size": sum(f.stat().st_size for f in csv_files)
        }
    except Exception as e:
        details["storage"]["files"]["error"] = str(e)

    # Music library details
    details["storage"]["music_library"] = {
        style: {
            "count": len(files),
            "total_duration": sum(f.get("duration", 0) for f in files),
            "files": [f["name"] for f in files[:3]]  # First 3 files
        }
        for style, files in state.music_library.items()
    }

    return details

@router.get("/ping")
def ping():
    """Simple ping endpoint"""
    return {"pong": datetime.now().isoformat()}

@router.get("/ready")
def readiness_check():
    """Readiness check for Kubernetes"""
    state = get_state()

    # Check if all critical components are ready
    ready_checks = {
        "database": False,
        "audio": False,
        "files": False
    }

    # Check database
    try:
        conn = sqlite3.connect('data/session_logs.db')
        conn.close()
        ready_checks["database"] = True
    except:
        pass

    # Check audio
    try:
        ready_checks["audio"] = pygame.mixer.get_init() is not None
    except:
        pass

    # Check files
    ready_checks["files"] = Path("data").exists() and Path("assets").exists()

    # Overall readiness
    is_ready = all(ready_checks.values())

    if is_ready:
        return {"ready": True, "checks": ready_checks}
    else:
        # Return 503 Service Unavailable if not ready
        from fastapi import status
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"ready": False, "checks": ready_checks}
        )

@router.get("/live")
def liveness_check():
    """Liveness check for Kubernetes"""
    # Simple check to see if the application is responsive
    return {"alive": True, "timestamp": datetime.now().isoformat()}