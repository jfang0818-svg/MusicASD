"""
API module - contains all API route handlers
"""

# Import all routers for easy access
from . import analytics
from . import engagement
from . import music
from . import session
from . import camera
from . import health

__all__ = [
    'analytics',
    'engagement',
    'music',
    'session',
    'camera',
    'health'
]