"""
Redis Client Service
Provides connection and helper methods for Redis operations
"""
import redis
import json
from typing import Optional, Any, Dict
from datetime import timedelta
import logging
from core.config import settings

logger = logging.getLogger(__name__)


class RedisClient:
    """Redis client for session state and caching"""

    def __init__(self):
        """Initialize Redis client"""
        self.redis: Optional[redis.Redis] = None
        self._pool: Optional[redis.ConnectionPool] = None

    def connect(self):
        """Connect to Redis server"""
        try:
            # Create connection pool
            self._pool = redis.ConnectionPool.from_url(
                settings.REDIS_URL,
                max_connections=settings.REDIS_MAX_CONNECTIONS,
                decode_responses=settings.REDIS_DECODE_RESPONSES
            )

            # Create Redis client
            self.redis = redis.Redis(connection_pool=self._pool)

            # Test connection
            self.redis.ping()
            logger.info(f"✓ Connected to Redis at {settings.REDIS_URL}")

        except redis.ConnectionError as e:
            logger.warning(f"⚠ Redis connection failed: {e}")
            logger.warning("⚠ Application will run without Redis (sessions will be in-memory only)")
            self.redis = None
        except Exception as e:
            logger.error(f"✗ Redis initialization error: {e}")
            self.redis = None

    def close(self):
        """Close Redis connection"""
        if self.redis:
            self.redis.close()
            logger.info("Redis connection closed")
        if self._pool:
            self._pool.disconnect()

    def is_connected(self) -> bool:
        """Check if Redis is connected"""
        if not self.redis:
            return False
        try:
            self.redis.ping()
            return True
        except:
            return False

    # Key-Value Operations
    def get(self, key: str) -> Optional[str]:
        """Get value by key"""
        if not self.redis:
            return None
        try:
            return self.redis.get(key)
        except Exception as e:
            logger.error(f"Redis GET error for key {key}: {e}")
            return None

    def set(self, key: str, value: str, expire: Optional[int] = None) -> bool:
        """Set value with optional expiration (seconds)"""
        if not self.redis:
            return False
        try:
            if expire:
                return self.redis.setex(key, expire, value)
            else:
                return self.redis.set(key, value)
        except Exception as e:
            logger.error(f"Redis SET error for key {key}: {e}")
            return False

    def delete(self, key: str) -> bool:
        """Delete key"""
        if not self.redis:
            return False
        try:
            return bool(self.redis.delete(key))
        except Exception as e:
            logger.error(f"Redis DELETE error for key {key}: {e}")
            return False

    def exists(self, key: str) -> bool:
        """Check if key exists"""
        if not self.redis:
            return False
        try:
            return bool(self.redis.exists(key))
        except Exception as e:
            logger.error(f"Redis EXISTS error for key {key}: {e}")
            return False

    # JSON Operations
    def get_json(self, key: str) -> Optional[Dict[str, Any]]:
        """Get JSON value by key"""
        value = self.get(key)
        if value:
            try:
                return json.loads(value)
            except json.JSONDecodeError as e:
                logger.error(f"JSON decode error for key {key}: {e}")
                return None
        return None

    def set_json(self, key: str, value: Dict[str, Any], expire: Optional[int] = None) -> bool:
        """Set JSON value with optional expiration"""
        try:
            json_str = json.dumps(value)
            return self.set(key, json_str, expire)
        except Exception as e:
            logger.error(f"JSON encode error for key {key}: {e}")
            return False

    # List Operations
    def lpush(self, key: str, *values: str) -> Optional[int]:
        """Push values to the left of list"""
        if not self.redis:
            return None
        try:
            return self.redis.lpush(key, *values)
        except Exception as e:
            logger.error(f"Redis LPUSH error for key {key}: {e}")
            return None

    def lrange(self, key: str, start: int = 0, end: int = -1) -> Optional[list]:
        """Get list range"""
        if not self.redis:
            return None
        try:
            return self.redis.lrange(key, start, end)
        except Exception as e:
            logger.error(f"Redis LRANGE error for key {key}: {e}")
            return None

    # Hash Operations
    def hset(self, name: str, key: str, value: str) -> bool:
        """Set hash field"""
        if not self.redis:
            return False
        try:
            return bool(self.redis.hset(name, key, value))
        except Exception as e:
            logger.error(f"Redis HSET error for {name}:{key}: {e}")
            return False

    def hget(self, name: str, key: str) -> Optional[str]:
        """Get hash field"""
        if not self.redis:
            return None
        try:
            return self.redis.hget(name, key)
        except Exception as e:
            logger.error(f"Redis HGET error for {name}:{key}: {e}")
            return None

    def hgetall(self, name: str) -> Optional[Dict]:
        """Get all hash fields"""
        if not self.redis:
            return None
        try:
            return self.redis.hgetall(name)
        except Exception as e:
            logger.error(f"Redis HGETALL error for {name}: {e}")
            return None

    # Expiration
    def expire(self, key: str, seconds: int) -> bool:
        """Set expiration on key"""
        if not self.redis:
            return False
        try:
            return bool(self.redis.expire(key, seconds))
        except Exception as e:
            logger.error(f"Redis EXPIRE error for key {key}: {e}")
            return False

    def ttl(self, key: str) -> Optional[int]:
        """Get time to live for key"""
        if not self.redis:
            return None
        try:
            return self.redis.ttl(key)
        except Exception as e:
            logger.error(f"Redis TTL error for key {key}: {e}")
            return None

    # Pattern matching
    def keys(self, pattern: str) -> Optional[list]:
        """Get keys matching pattern"""
        if not self.redis:
            return None
        try:
            return self.redis.keys(pattern)
        except Exception as e:
            logger.error(f"Redis KEYS error for pattern {pattern}: {e}")
            return None

    # Pub/Sub (for future real-time features)
    def publish(self, channel: str, message: str) -> Optional[int]:
        """Publish message to channel"""
        if not self.redis:
            return None
        try:
            return self.redis.publish(channel, message)
        except Exception as e:
            logger.error(f"Redis PUBLISH error for channel {channel}: {e}")
            return None


# Singleton instance
redis_client = RedisClient()
