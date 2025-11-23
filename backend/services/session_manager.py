"""
Session Manager Service
Manages therapy sessions with Redis (fast access) and Azure Blob Storage (persistence)
"""
import uuid
import json
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
import logging
from services.redis_client import RedisClient
from services.azure_storage import AzureStorageService

logger = logging.getLogger(__name__)


class SessionManager:
    """
    Session Manager with dual storage:
    - Redis: Fast access, temporary storage (24h TTL)
    - Azure Blob: Persistent storage, long-term history
    """

    def __init__(self, redis: RedisClient, azure: AzureStorageService):
        """Initialize with Redis and Azure clients"""
        self.redis = redis
        self.azure = azure
        self.session_ttl = 86400  # 24 hours in seconds

    async def create_session(self, user_id: str, child_id: str, child_name: str) -> Dict[str, Any]:
        """
        Create a new therapy session
        Returns session data with session_id
        """
        # Generate unique session ID
        session_id = f"session_{int(datetime.utcnow().timestamp())}_{uuid.uuid4().hex[:8]}"
        timestamp = datetime.utcnow().isoformat()

        # Check if user already has active session
        active_session_id = self.redis.get(f"active_session:{user_id}")
        if active_session_id:
            logger.warning(f"User {user_id} already has active session: {active_session_id}")
            # End previous session automatically
            await self.end_session(active_session_id, user_id)

        # Create session data
        session_data = {
            "id": session_id,
            "user_id": user_id,
            "child_id": child_id,
            "child_name": child_name,
            "status": "active",
            "timestamp": timestamp,
            "created_at": timestamp,
            "logs": [],
            "engagement_level": "MED",
            "music_played": [],
            "suggestions_generated": 0,
            "suggestions_accepted": 0,
            "metrics": [],
            "quick_notes": ""
        }

        # Save to Redis (fast access)
        if self.redis.is_connected():
            success = self.redis.set_json(
                f"session:{session_id}",
                session_data,
                expire=self.session_ttl
            )
            if success:
                # Track as active session for this user
                self.redis.set(f"active_session:{user_id}", session_id, expire=self.session_ttl)
                logger.info(f"✓ Session {session_id} saved to Redis")
        else:
            logger.warning("⚠ Redis not available, session data in-memory only")

        # Save to Azure (persistence)
        try:
            await self.azure.save_session(child_id, session_id, session_data)
            logger.info(f"✓ Session {session_id} saved to Azure Blob Storage")
        except Exception as e:
            logger.error(f"✗ Failed to save session to Azure: {e}")

        return session_data

    async def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """
        Get session data
        Tries Redis first (fast), falls back to Azure if not found
        """
        # Try Redis first
        if self.redis.is_connected():
            session = self.redis.get_json(f"session:{session_id}")
            if session:
                logger.debug(f"Session {session_id} retrieved from Redis")
                return session

        # Fallback to Azure (e.g., after server restart)
        logger.debug(f"Session {session_id} not in Redis, checking Azure...")

        # We need child_id to query Azure - extract from session_id or scan
        # For now, we'll return None if not in Redis
        # TODO: Implement Azure fallback with child_id mapping
        logger.warning(f"Session {session_id} not found in Redis and Azure lookup not implemented")
        return None

    async def update_session(self, session_id: str, updates: Dict[str, Any]) -> bool:
        """
        Update session data
        Updates both Redis and Azure
        """
        # Get current session
        session = await self.get_session(session_id)
        if not session:
            logger.error(f"Cannot update non-existent session: {session_id}")
            return False

        # Apply updates
        session.update(updates)
        session["updated_at"] = datetime.utcnow().isoformat()

        # Update Redis
        if self.redis.is_connected():
            self.redis.set_json(
                f"session:{session_id}",
                session,
                expire=self.session_ttl
            )

        # Update Azure (async, can be backgrounded)
        try:
            await self.azure.save_session(
                session["child_id"],
                session_id,
                session
            )
            return True
        except Exception as e:
            logger.error(f"Failed to update session in Azure: {e}")
            return False

    async def add_log(self, session_id: str, user_id: str, log_entry: Dict[str, Any]) -> bool:
        """
        Add log entry to session
        Validates user ownership before adding
        """
        # Get session
        session = await self.get_session(session_id)
        if not session:
            raise ValueError("Session not found")

        # Verify ownership
        if session.get("user_id") != user_id:
            raise PermissionError("Session belongs to another user")

        # Add timestamp if not present
        if "timestamp" not in log_entry:
            log_entry["timestamp"] = datetime.utcnow().isoformat()

        # Append log
        session["logs"].append(log_entry)

        # Update session
        return await self.update_session(session_id, {"logs": session["logs"]})

    async def end_session(self, session_id: str, user_id: str) -> Dict[str, Any]:
        """
        End active session
        Saves final state to Azure and removes from Redis
        """
        # Get session
        session = await self.get_session(session_id)
        if not session:
            logger.warning(f"Attempted to end non-existent session: {session_id}")
            return {"status": "not_found", "session_id": session_id}

        # Verify ownership
        if session.get("user_id") != user_id:
            raise PermissionError("Cannot end session belonging to another user")

        # Mark as completed
        session["status"] = "completed"
        session["ended_at"] = datetime.utcnow().isoformat()

        # Calculate session duration
        try:
            start = datetime.fromisoformat(session["timestamp"])
            end = datetime.fromisoformat(session["ended_at"])
            duration_seconds = (end - start).total_seconds()
            session["duration_seconds"] = duration_seconds
        except:
            session["duration_seconds"] = 0

        # Save final state to Azure
        try:
            await self.azure.save_session(
                session["child_id"],
                session_id,
                session
            )
            logger.info(f"✓ Session {session_id} final state saved to Azure")
        except Exception as e:
            logger.error(f"✗ Failed to save final session state: {e}")

        # Remove from Redis
        if self.redis.is_connected():
            self.redis.delete(f"session:{session_id}")
            self.redis.delete(f"active_session:{user_id}")
            logger.info(f"✓ Session {session_id} removed from Redis")

        return {
            "status": "ended",
            "session_id": session_id,
            "duration_seconds": session.get("duration_seconds", 0),
            "total_logs": len(session.get("logs", []))
        }

    def get_active_session(self, user_id: str) -> Optional[str]:
        """
        Get active session ID for user
        Returns None if no active session
        """
        if not self.redis.is_connected():
            return None

        return self.redis.get(f"active_session:{user_id}")

    async def get_child_sessions(
        self,
        child_id: str,
        user_id: str,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Get all sessions for a child
        Returns sessions sorted by most recent first
        """
        try:
            sessions = await self.azure.list_child_sessions(child_id)

            # Filter by user_id for security
            user_sessions = [
                s for s in sessions
                if s.get("user_id") == user_id
            ]

            # Sort by timestamp descending
            user_sessions.sort(
                key=lambda x: x.get("timestamp", ""),
                reverse=True
            )

            # Limit results
            return user_sessions[:limit]

        except Exception as e:
            logger.error(f"Failed to get child sessions: {e}")
            return []

    def get_session_stats(self, session_id: str) -> Optional[Dict[str, Any]]:
        """
        Get session statistics
        Returns quick stats from Redis if available
        """
        session = self.redis.get_json(f"session:{session_id}")
        if not session:
            return None

        logs = session.get("logs", [])
        engagement_changes = [
            log for log in logs
            if log.get("event") == "Engagement Changed"
        ]
        music_events = [
            log for log in logs
            if log.get("event") and "music" in log.get("event", "").lower()
        ]

        return {
            "session_id": session_id,
            "status": session.get("status"),
            "total_logs": len(logs),
            "engagement_changes": len(engagement_changes),
            "music_events": len(music_events),
            "current_engagement": session.get("engagement_level"),
            "duration_minutes": len(logs) * 0.5  # Rough estimate
        }


# Singleton instance (will be initialized in main.py)
session_manager: Optional[SessionManager] = None


def get_session_manager() -> SessionManager:
    """Get or create session manager instance"""
    global session_manager
    if not session_manager:
        from services.redis_client import redis_client
        from services.azure_storage import azure_storage
        session_manager = SessionManager(redis_client, azure_storage)
    return session_manager
