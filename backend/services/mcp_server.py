"""
Simplified MCP (Model Context Protocol) Server
Implements three core tools for Project ASD
"""
import json
import csv
import os
from datetime import datetime
from typing import Dict, Any, Optional

class MCPServer:
    """
    Simplified MCP server implementing three tools:
    1. engagement.read - Read current engagement level
    2. music.play - Play music with specified style
    3. session.log - Log session events
    """

    def __init__(self):
        self.tools = {
            "engagement.read": self._engagement_read,
            "music.play": self._music_play,
            "session.log": self._session_log
        }

        # Internal state
        self._engagement_level = "MED"
        self._current_music = None

        # Ensure data directory exists
        os.makedirs("data", exist_ok=True)

        # Initialize CSV with headers if doesn't exist
        if not os.path.exists("data/sessions.csv"):
            with open("data/sessions.csv", "w", newline="") as f:
                writer = csv.writer(f)
                writer.writerow([
                    "timestamp", "session_id", "event_type",
                    "engagement", "music_style", "note", "details"
                ])

    def execute_tool(self, tool_name: str, params: Optional[Dict] = None) -> Dict[str, Any]:
        """Execute an MCP tool by name"""
        if tool_name not in self.tools:
            return {
                "error": f"Tool {tool_name} not found",
                "available_tools": list(self.tools.keys())
            }

        try:
            result = self.tools[tool_name](params or {})
            return {"success": True, "result": result}
        except Exception as e:
            return {"error": str(e), "tool": tool_name}

    def _engagement_read(self, params: Dict) -> str:
        """Tool: engagement.read - Returns current engagement level"""
        return self._engagement_level

    def _music_play(self, params: Dict) -> Dict[str, Any]:
        """Tool: music.play - Initiates music playback"""
        style = params.get("style", "calm")

        if style not in ["calm", "happy", "energetic"]:
            raise ValueError(f"Invalid music style: {style}")

        self._current_music = style

        return {
            "status": "playing",
            "style": style,
            "timestamp": datetime.now().isoformat()
        }

    def _session_log(self, params: Dict) -> Dict[str, Any]:
        """Tool: session.log - Logs session events to CSV"""
        event = params.get("event", "unknown")
        note = params.get("note", "")
        details = params.get("details", {})

        # Write to CSV
        with open("data/sessions.csv", "a", newline="") as f:
            writer = csv.writer(f)
            writer.writerow([
                datetime.now().isoformat(),
                details.get("session_id", ""),
                event,
                self._engagement_level,
                self._current_music or "",
                note,
                json.dumps(details)
            ])

        return {
            "logged": True,
            "event": event,
            "timestamp": datetime.now().isoformat()
        }

    # Helper methods for direct access (not via MCP protocol)

    def read_engagement(self) -> str:
        """Direct read of engagement level"""
        return self._engagement_level

    def set_engagement(self, level: str):
        """Direct set of engagement level"""
        if level in ["LOW", "MED", "HIGH"]:
            self._engagement_level = level

    def play_music(self, style: str) -> Dict:
        """Direct music play request"""
        return self._music_play({"style": style})

    def log_event(self, event_type: str, details: Dict):
        """Direct event logging"""
        return self._session_log({
            "event": event_type,
            "details": details
        })

    def get_tool_descriptions(self) -> Dict[str, str]:
        """Get descriptions of available MCP tools"""
        return {
            "engagement.read": "Returns current engagement level (LOW/MED/HIGH)",
            "music.play": "Plays music with specified style (calm/happy/energetic)",
            "session.log": "Logs session events to persistent storage"
        }