"""
Session State Management
"""
import sqlite3
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
        self.init_database()
        self.scan_music_library()
        self.load_session_history()

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

    def init_database(self):
        """Initialize SQLite database for session logs"""
        try:
            conn = sqlite3.connect('data/session_logs.db')
            c = conn.cursor()

            # Create logs table
            c.execute('''CREATE TABLE IF NOT EXISTS logs
                         (id INTEGER PRIMARY KEY AUTOINCREMENT,
                          session_id TEXT,
                          timestamp TEXT,
                          event TEXT,
                          engagement TEXT,
                          music_style TEXT,
                          suggestion TEXT,
                          caregiver_action TEXT,
                          child_response TEXT,
                          notes TEXT)''')

            # Create sessions summary table for analytics
            c.execute('''CREATE TABLE IF NOT EXISTS sessions
                         (id INTEGER PRIMARY KEY AUTOINCREMENT,
                          session_id TEXT UNIQUE,
                          start_time TEXT,
                          end_time TEXT,
                          duration_minutes INTEGER,
                          avg_engagement TEXT,
                          music_styles_used TEXT,
                          total_events INTEGER)''')

            conn.commit()
            conn.close()
            logger.info("Database initialized successfully")
        except Exception as e:
            logger.error(f"Database initialization failed: {e}")

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

    def load_session_history(self):
        """Load session history from database for analytics"""
        try:
            conn = sqlite3.connect('data/session_logs.db')
            c = conn.cursor()

            # Get recent sessions
            c.execute("""SELECT session_id, start_time, end_time, duration_minutes,
                               avg_engagement, music_styles_used, total_events
                        FROM sessions
                        ORDER BY start_time DESC
                        LIMIT 100""")

            rows = c.fetchall()

            self.sessions_history = []
            for row in rows:
                self.sessions_history.append({
                    "session_id": row[0],
                    "start_time": row[1],
                    "end_time": row[2],
                    "duration_minutes": row[3],
                    "avg_engagement": row[4],
                    "music_styles_used": row[5],
                    "total_events": row[6]
                })

            conn.close()
            logger.info(f"Loaded {len(self.sessions_history)} sessions from history")

        except Exception as e:
            logger.error(f"Failed to load session history: {e}")
            self.sessions_history = []

    def save_session_summary(self):
        """Save session summary when session ends"""
        if not self.session_id or not self.logs:
            logger.warning("No session data to save")
            return

        try:
            # Calculate session metrics
            start_time = self.logs[0]["timestamp"] if self.logs else datetime.now().isoformat()
            end_time = self.logs[-1]["timestamp"] if self.logs else datetime.now().isoformat()

            # Calculate duration
            start_dt = datetime.fromisoformat(start_time)
            end_dt = datetime.fromisoformat(end_time)
            duration_minutes = int((end_dt - start_dt).total_seconds() / 60)

            # Calculate average engagement
            engagement_scores = {"LOW": 1, "MED": 2, "HIGH": 3}
            engagements = [log.get("engagement", "MED") for log in self.logs if log.get("engagement")]

            if engagements:
                avg_score = sum(engagement_scores.get(e, 2) for e in engagements) / len(engagements)
                avg_engagement = ["LOW", "MED", "HIGH"][min(2, max(0, int(avg_score) - 1))]
            else:
                avg_engagement = "MED"

            # Get music styles used
            music_styles = list(set([
                log.get("music_style", "")
                for log in self.logs
                if log.get("music_style")
            ]))
            music_styles_str = ",".join(filter(None, music_styles))

            # Save to database
            conn = sqlite3.connect('data/session_logs.db')
            c = conn.cursor()

            c.execute("""INSERT OR REPLACE INTO sessions
                         (session_id, start_time, end_time, duration_minutes,
                          avg_engagement, music_styles_used, total_events)
                         VALUES (?, ?, ?, ?, ?, ?, ?)""",
                      (self.session_id, start_time, end_time, duration_minutes,
                       avg_engagement, music_styles_str, len(self.logs)))

            conn.commit()
            conn.close()

            logger.info(f"Saved session summary for {self.session_id}")
            logger.info(f"  Duration: {duration_minutes} minutes")
            logger.info(f"  Average engagement: {avg_engagement}")
            logger.info(f"  Events logged: {len(self.logs)}")

        except Exception as e:
            logger.error(f"Failed to save session summary: {e}")

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