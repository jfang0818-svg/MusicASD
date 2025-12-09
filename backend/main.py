"""
Project ASD Backend Server - Main Entry Point
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import logging
import pygame
import uvicorn

# Import slowapi for rate limiting
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Import configuration and state
from core.config import settings
from core.state import SessionState

# Import API routers
from api import analytics, engagement, music, music_response, session, camera, health, auth, profile, websocket_analysis, goals, session_notes, child_analytics, home_routines, notifications, interactive_activities, session_videos, gamification, favorites, freeze_game, sound_matching, ambient_music, musical_storytelling, music_recommendations, movement_activities, emotion_music, tracking, planned_sessions, ai_session_planner, ai_activity_generator, templates

# Import services
from services.azure_storage import azure_storage
from services.redis_client import redis_client

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)

# Initialize FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Music Therapy Assistant for ASD Support"
)

# Add rate limiter to app state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

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
app.include_router(auth.router)  # Authentication endpoints
app.include_router(profile.router)  # Child profile management
app.include_router(favorites.router)  # Favorites management
app.include_router(freeze_game.router)  # Freeze game activity
app.include_router(sound_matching.router)  # Sound matching game
app.include_router(ambient_music.router)  # Ambient generative music
app.include_router(musical_storytelling.router)  # Musical storytelling
app.include_router(music_recommendations.router)  # AI music recommendations
app.include_router(movement_activities.router)  # Movement activities
app.include_router(emotion_music.router)  # Emotion-matching music
app.include_router(tracking.router)  # Usage tracking and analytics
app.include_router(goals.router)  # Goal tracking
app.include_router(session_notes.router)  # Session notes and observations
app.include_router(planned_sessions.router)  # Planned sessions management
app.include_router(templates.router)  # Session templates management
app.include_router(ai_session_planner.router)  # AI-powered session planning
app.include_router(ai_activity_generator.router)  # AI-powered activity generation
app.include_router(child_analytics.router)  # Child progress analytics
app.include_router(home_routines.router)  # Home routines and playlist export
app.include_router(notifications.router)  # Notifications and parent communication
app.include_router(interactive_activities.router)  # Turn-taking interactive activities
app.include_router(session_videos.router)  # Video recording and playback
app.include_router(gamification.router)  # Achievements and rewards
app.include_router(analytics.router)
app.include_router(engagement.router)
app.include_router(music.router)
app.include_router(music_response.router)  # Music response metrics
app.include_router(session.router)
app.include_router(camera.router)
app.include_router(health.router)
app.include_router(websocket_analysis.router)  # WebSocket for video/audio analysis

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
            "auth": "/auth/* (register, login, me)",
            "profile": "/profile/* (create, list, update child profiles)",
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

    # Initialize Redis
    try:
        redis_client.connect()
        if redis_client.is_connected():
            logger.info("✓ Redis connected and ready")
        else:
            logger.warning("⚠ Redis not available - running without caching")
    except Exception as e:
        logger.warning(f"⚠ Redis initialization failed: {e}")

    # Initialize Azure Blob Storage
    if settings.AZURE_STORAGE_CONNECTION_STRING:
        try:
            await azure_storage.initialize()
            logger.info("✓ Azure Blob Storage initialized successfully")
        except Exception as e:
            logger.error(f"✗ Failed to initialize Azure Blob Storage: {e}")
    else:
        logger.warning("⚠ Azure Blob Storage not configured (connection string missing)")

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

    # Close Redis connection
    try:
        redis_client.close()
        logger.info("✓ Redis connection closed")
    except Exception as e:
        logger.error(f"Error closing Redis: {e}")

    # Close Azure Blob Storage connection
    if settings.AZURE_STORAGE_CONNECTION_STRING:
        try:
            await azure_storage.close()
            logger.info("✓ Azure Blob Storage connection closed")
        except Exception as e:
            logger.error(f"✗ Error closing Azure Blob Storage: {e}")

    logger.info("Server shutdown complete")

if __name__ == "__main__":
    print("=" * 60)
    print(f"{settings.APP_NAME} v{settings.APP_VERSION}")
    print("=" * 60)
    print("Scanning for music files...")

    for style, files in state.music_library.items():
        print(f"   {style}: {len(files)} files")
        for file in files[:3]:
            print(f"      - {file['name']}")
        if len(files) > 3:
            print(f"      ... and {len(files) - 3} more")

    print("=" * 60)
    print(f"Server starting at http://localhost:{settings.PORT}")
    print(f"API docs at http://localhost:{settings.PORT}/docs")
    print(f"Frontend should connect to http://localhost:3000")
    print(f"Environment: {settings.ENVIRONMENT}")
    print("=" * 60)

    uvicorn.run(
        app,
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.RELOAD
    )