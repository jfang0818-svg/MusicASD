"""
Project ASD Backend Server - Main Entry Point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
import pygame
import uvicorn

# Import configuration and state
from core.config import settings
from core.state import SessionState

# Import API routers
from api import analytics, engagement, music, session, camera, health

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Music Therapy Assistant for ASD Support"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize pygame mixer for audio
try:
    pygame.mixer.init(
        frequency=settings.AUDIO_SAMPLE_RATE,
        size=-16,
        channels=2,
        buffer=512
    )
    logger.info("Pygame mixer initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize pygame mixer: {e}")

# Initialize global state
state = SessionState()

# Include API routers
app.include_router(analytics.router)
app.include_router(engagement.router)
app.include_router(music.router)
app.include_router(session.router)
app.include_router(camera.router)
app.include_router(health.router)

# Root endpoint
@app.get("/")
def read_root():
    """Root endpoint with API information"""
    return {
        "message": f"{settings.APP_NAME} Running",
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "music_files": sum(len(files) for files in state.music_library.values()),
        "endpoints": {
            "analytics": "/api/v1/analytics/dashboard",
            "engagement": "/engagement (GET/POST)",
            "music": "/music/* (play, stop, library, generate)",
            "session": "/session/* (start, stop, status, logs)",
            "camera": "/camera/* (toggle, status)",
            "health": "/health (detailed, simple, ready, live)",
            "docs": "/docs (Swagger UI)",
            "redoc": "/redoc (ReDoc UI)"
        }
    }

@app.on_event("startup")
async def startup_event():
    """Initialize application on startup"""
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info(f"Environment: {settings.ENVIRONMENT}")

    # Display music library status
    logger.info("Music Library Status:")
    for style, files in state.music_library.items():
        logger.info(f"  {style}: {len(files)} files")

    logger.info(f"Server ready at http://localhost:{settings.PORT}")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("Shutting down server...")

    # Stop any playing music
    if state.music_playing:
        try:
            pygame.mixer.music.stop()
        except:
            pass

    # Save any pending session data
    if state.session_active:
        state.save_session_summary()

    logger.info("Server shutdown complete")

if __name__ == "__main__":
    print("=" * 60)
    print(f"🎵 {settings.APP_NAME} v{settings.APP_VERSION}")
    print("=" * 60)
    print("📁 Scanning for music files...")

    for style, files in state.music_library.items():
        print(f"   {style}: {len(files)} files")
        for file in files[:3]:
            print(f"      - {file['name']}")
        if len(files) > 3:
            print(f"      ... and {len(files) - 3} more")

    print("=" * 60)
    print(f"🌐 Server starting at http://localhost:{settings.PORT}")
    print(f"📊 API docs at http://localhost:{settings.PORT}/docs")
    print(f"💡 Frontend should connect to http://localhost:3000")
    print(f"✅ Environment: {settings.ENVIRONMENT}")
    print("=" * 60)

    uvicorn.run(
        app,
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.RELOAD
    )