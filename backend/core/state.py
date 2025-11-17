"""
Session State Management
"""
import logging
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
        self.music_library = {"calm": [], "happy": [], "energetic": []}
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
            Path("assets/music/calm"),
            Path("assets/music/happy"),
            Path("assets/music/energetic")
        ]

        for directory in directories:
            directory.mkdir(parents=True, exist_ok=True)

        logger.info("Directories initialized")

    def scan_music_library(self):
        """Scan and load all music files from assets folder"""
        self.music_library = {"calm": [], "happy": [], "energetic": []}

        # Check both parent and local assets paths
        search_paths = [
            Path("../assets/music"),  # Parent directory
            Path("assets/music")      # Local directory
        ]

        for assets_path in search_paths:
            if not assets_path.exists():
                continue

            logger.info(f"Scanning music library at: {assets_path.absolute()}")

            for style in ["calm", "happy", "energetic"]:
                style_path = assets_path / style
                if not style_path.exists():
                    continue

                # Scan for various audio formats
                audio_extensions = ['*.mp3', '*.wav', '*.ogg', '*.m4a']

                for ext in audio_extensions:
                    for file_path in style_path.glob(ext):
                        if not file_path.is_file():
                            continue

                        # Check if file already in library
                        if any(f["name"] == file_path.name for f in self.music_library[style]):
                            continue

                        file_info = {
                            "name": file_path.name,
                            "path": str(file_path.absolute()),
                            "size": file_path.stat().st_size,
                            "duration": self.get_audio_duration(str(file_path.absolute()))
                        }

                        self.music_library[style].append(file_info)
                        logger.debug(f"Added: {file_path.name} to {style} library")

        # Scan generated files
        self._scan_generated_files()

        # Log summary
        total_files = sum(len(files) for files in self.music_library.values())
        logger.info(f"Music library loaded: {total_files} files total")
        for style, files in self.music_library.items():
            logger.info(f"  {style}: {len(files)} files")

    def _scan_generated_files(self):
        """Scan generated music files"""
        generated_path = Path("assets/music/generated")
        if not generated_path.exists():
            return

        for file_path in generated_path.glob("*.wav"):
            # Determine style from filename
            style = "calm"  # default
            filename_lower = file_path.name.lower()

            if "happy" in filename_lower:
                style = "happy"
            elif "energetic" in filename_lower:
                style = "energetic"

            # Check if already in generated tones list
            if any(t["name"] == file_path.name for t in self.generated_tones):
                continue

            tone_info = {
                "name": file_path.name,
                "style": style,
                "duration": self.get_audio_duration(str(file_path.absolute())),
                "created": datetime.fromtimestamp(file_path.stat().st_mtime).isoformat()
            }

            self.generated_tones.append(tone_info)

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