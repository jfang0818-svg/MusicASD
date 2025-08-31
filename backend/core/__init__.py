"""
Core module for application state and configuration
"""
from .config import settings
from .state import SessionState

__all__ = ['settings', 'SessionState']