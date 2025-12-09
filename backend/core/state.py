"""
Session State Management
"""
import logging
import asyncio
from pathlib import Path
from datetime import datetime
import pygame

logger = logging.getLogger(__name__)

class SessionState:
    """Global application state manager"""

    def __init__(self):
        # Session management
        self.engagement_level = "MED"
        self.session_active = False
        self.session_id = None
        self.logs = []
        self.sessions_history = []

        # Music management
        self.current_music = None
        self.music_playing = False
        self.music_library = {
            "calming_regulation": [],
            "focus_attention": [],
            "social_interactive": [],
            "movement_motor": [],
            "sensory_seeking": [],
            "sensory_soothing": [],
            "sleep_rest": [],
            "transition": []
        }
        self.generated_tones = []

        # Camera management
        self.camera_enabled = False

        # Initialize components
        self.init_directories()
        self.scan_music_library()
        # Note: Session history now managed by SessionManager with Redis + Azure

    def init_directories(self):
        """Create necessary directories"""
        directories = [
            Path("data"),
            Path("logs"),
            Path("assets/music/generated"),
            Path("assets/music/calming_regulation"),
            Path("assets/music/focus_attention"),
            Path("assets/music/social_interactive"),
            Path("assets/music/movement_motor"),
            Path("assets/music/sensory_seeking"),
            Path("assets/music/sensory_soothing"),
            Path("assets/music/sleep_rest"),
            Path("assets/music/transition"),
            Path("cache/music")  # Cache for Azure music files
        ]

        for directory in directories:
            directory.mkdir(parents=True, exist_ok=True)

        logger.info("Directories initialized")

    def scan_music_library(self):
        """Load music library from Azure Blob Storage"""
        self.music_library = {
            "calming_regulation": [],
            "focus_attention": [],
            "social_interactive": [],
            "movement_motor": [],
            "sensory_seeking": [],
            "sensory_soothing": [],
            "sleep_rest": [],
            "transition": []
        }

        try:
            # Check if there's a running event loop
            try:
                loop = asyncio.get_running_loop()
                # If we're in an async context, can't use asyncio.run()
                # Schedule the task to run in the existing loop
                import concurrent.futures
                import threading

                def run_in_thread():
                    new_loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(new_loop)
                    try:
                        new_loop.run_until_complete(self._load_music_from_azure())
                    finally:
                        new_loop.close()

                thread = threading.Thread(target=run_in_thread)
                thread.start()
                thread.join()

            except RuntimeError:
                # No running event loop, we can use asyncio.run()
                asyncio.run(self._load_music_from_azure())
        except Exception as e:
            logger.error(f"Failed to load music from Azure: {e}")
            logger.info("Music library will be empty - upload music files to Azure")

        # Log summary
        total_files = sum(len(files) for files in self.music_library.values())
        logger.info(f"Music library loaded from Azure: {total_files} files total")
        for style, files in self.music_library.items():
            logger.info(f"  {style}: {len(files)} files")

    async def _load_music_from_azure(self):
        """Load music file list from Azure"""
        from services.azure_storage import azure_storage

        if not azure_storage.container_client:
            await azure_storage.initialize()

        # Parallelize loading from all categories
        categories = ["calming_regulation", "focus_attention", "social_interactive", "movement_motor",
                     "sensory_seeking", "sensory_soothing", "sleep_rest", "transition", "generated"]

        # Load all categories in parallel using asyncio.gather
        all_music_files = await asyncio.gather(
            *[azure_storage.list_music_files(category) for category in categories]
        )

        # Process results from all categories
        for music_files in all_music_files:
            for file_info in music_files:
                # Determine target category (generated files may be categorized)
                target_category = file_info["category"]
                if target_category == "generated":
                    # Try to determine style from filename
                    filename_lower = file_info["name"].lower()
                    if "happy" in filename_lower:
                        target_category = "happy"
                    elif "energetic" in filename_lower:
                        target_category = "energetic"
                    else:
                        target_category = "calm"

                if target_category not in self.music_library:
                    self.music_library[target_category] = []

                # Cache path where file will be stored locally
                cache_path = Path(f"cache/music/{file_info['category']}/{file_info['name']}")

                music_entry = {
                    "name": file_info["name"],
                    "path": str(cache_path.absolute()),  # Local cache path
                    "blob_path": file_info["blob_path"],  # Azure path
                    "category": file_info["category"],
                    "categories": file_info.get("categories", [file_info["category"]]),  # Multiple categories
                    "size": file_info["size"],
                    "cached": cache_path.exists(),  # Is it already cached?
                    "duration": 0.0  # Will be calculated when cached
                }

                # Add music to all its categories
                for cat in music_entry["categories"]:
                    if cat in self.music_library:
                        self.music_library[cat].append(music_entry)
                        logger.debug(f"Added: {file_info['name']} to {cat} library (Azure)")

    async def ensure_music_cached(self, music_entry: dict) -> str:
        """Ensure music file is cached locally, download if needed"""
        from services.azure_storage import azure_storage

        cache_path = Path(music_entry["path"])

        # Already cached?
        if cache_path.exists():
            music_entry["cached"] = True
            return str(cache_path.absolute())

        # Download from Azure
        logger.info(f"Downloading {music_entry['name']} from Azure...")
        cache_path.parent.mkdir(parents=True, exist_ok=True)

        file_data = await azure_storage.download_music_file(
            music_entry["category"],
            music_entry["name"]
        )

        if not file_data:
            raise FileNotFoundError(f"Failed to download {music_entry['name']} from Azure")

        # Save to cache
        with open(cache_path, 'wb') as f:
            f.write(file_data)

        # Calculate duration
        music_entry["duration"] = self.get_audio_duration(str(cache_path.absolute()))
        music_entry["cached"] = True

        logger.info(f"Cached: {music_entry['name']} ({len(file_data)} bytes)")
        return str(cache_path.absolute())


    def get_audio_duration(self, filepath):
        """Get audio file duration in seconds"""
        try:
            sound = pygame.mixer.Sound(filepath)
            return round(sound.get_length(), 2)
        except Exception as e:
            logger.warning(f"Could not get duration for {filepath}: {e}")
            return 0.0

    # Legacy methods removed - session history now managed by SessionManager
    # with Redis + Azure Blob Storage

    def save_session_summary(self):
        """
        Legacy method - no longer saves to SQLite
        Session data now managed by SessionManager with Redis + Azure
        """
        logger.info("save_session_summary called (legacy - now handled by SessionManager)")

    def reset_session(self):
        """Reset session-related state"""
        self.session_active = False
        self.session_id = None
        self.logs = []
        self.camera_enabled = False
        self.music_playing = False
        self.current_music = None
        logger.info("Session state reset")

    def get_statistics(self):
        """Get current statistics"""
        return {
            "total_sessions": len(self.sessions_history),
            "music_files": sum(len(files) for files in self.music_library.values()),
            "generated_tones": len(self.generated_tones),
            "current_engagement": self.engagement_level,
            "session_active": self.session_active
        }