"""
Background Task Manager for async music generation
"""
import asyncio
import logging
import uuid
from typing import Dict, Any, Optional
from datetime import datetime
from enum import Enum

logger = logging.getLogger(__name__)


class TaskStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class TaskManager:
    """Manages background tasks for music generation"""

    def __init__(self):
        self.tasks: Dict[str, Dict[str, Any]] = {}
        self._lock = asyncio.Lock()

    async def create_task(self, task_type: str, params: Dict[str, Any]) -> str:
        """Create a new task and return task_id"""
        task_id = str(uuid.uuid4())[:8]

        async with self._lock:
            self.tasks[task_id] = {
                "id": task_id,
                "type": task_type,
                "status": TaskStatus.PENDING,
                "params": params,
                "result": None,
                "error": None,
                "progress": 0,
                "created_at": datetime.now().isoformat(),
                "started_at": None,
                "completed_at": None
            }

        logger.info(f"Created task {task_id} of type {task_type}")
        return task_id

    async def update_task(
        self,
        task_id: str,
        status: Optional[TaskStatus] = None,
        progress: Optional[int] = None,
        result: Optional[Dict[str, Any]] = None,
        error: Optional[str] = None
    ):
        """Update task status"""
        async with self._lock:
            if task_id not in self.tasks:
                return

            task = self.tasks[task_id]

            if status:
                task["status"] = status
                if status == TaskStatus.RUNNING:
                    task["started_at"] = datetime.now().isoformat()
                elif status in [TaskStatus.COMPLETED, TaskStatus.FAILED]:
                    task["completed_at"] = datetime.now().isoformat()

            if progress is not None:
                task["progress"] = progress

            if result is not None:
                task["result"] = result

            if error is not None:
                task["error"] = error

    async def get_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Get task info"""
        async with self._lock:
            return self.tasks.get(task_id)

    async def get_user_tasks(self, user_id: str = None, task_type: str = None) -> list:
        """Get tasks, optionally filtered by user or type"""
        async with self._lock:
            tasks = list(self.tasks.values())

            if task_type:
                tasks = [t for t in tasks if t["type"] == task_type]

            # Sort by created_at descending
            tasks.sort(key=lambda t: t["created_at"], reverse=True)

            # Only return recent tasks (last 20)
            return tasks[:20]

    async def cleanup_old_tasks(self, max_age_hours: int = 24):
        """Remove tasks older than max_age_hours"""
        from datetime import timedelta

        cutoff = datetime.now() - timedelta(hours=max_age_hours)

        async with self._lock:
            to_remove = []
            for task_id, task in self.tasks.items():
                created = datetime.fromisoformat(task["created_at"])
                if created < cutoff:
                    to_remove.append(task_id)

            for task_id in to_remove:
                del self.tasks[task_id]

            if to_remove:
                logger.info(f"Cleaned up {len(to_remove)} old tasks")


# Singleton instance
task_manager = TaskManager()
