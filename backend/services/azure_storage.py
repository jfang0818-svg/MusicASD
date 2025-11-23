"""
Azure Blob Storage Service
Handles all interactions with Azure Blob Storage for user data, profiles, and files
"""
import json
import asyncio
from typing import Optional, Dict, Any, List
from datetime import datetime
from pathlib import Path
from azure.storage.blob.aio import BlobServiceClient, ContainerClient
from azure.storage.blob import ContentSettings
from azure.core.exceptions import ResourceNotFoundError, ResourceExistsError
from core.config import settings


class AzureStorageService:
    """Service for managing Azure Blob Storage operations"""

    def __init__(self):
        """Initialize Azure Blob Storage client"""
        self.connection_string = settings.AZURE_STORAGE_CONNECTION_STRING
        self.container_name = settings.AZURE_CONTAINER_NAME
        self.blob_service_client: Optional[BlobServiceClient] = None
        self.container_client: Optional[ContainerClient] = None

    async def initialize(self):
        """Initialize the blob service client and container"""
        if not self.connection_string:
            print("Warning: Azure Storage connection string not configured")
            return

        try:
            self.blob_service_client = BlobServiceClient.from_connection_string(
                self.connection_string
            )
            self.container_client = self.blob_service_client.get_container_client(
                self.container_name
            )

            # Create container if it doesn't exist
            try:
                await self.container_client.create_container()
                print(f"Created container: {self.container_name}")
            except ResourceExistsError:
                print(f"Container already exists: {self.container_name}")

        except Exception as e:
            print(f"Error initializing Azure Storage: {e}")
            raise

    async def close(self):
        """Close the blob service client"""
        if self.blob_service_client:
            await self.blob_service_client.close()

    # User Management - Single File Approach
    USERS_FILE_PATH = "users/users.json"

    async def _load_all_users(self) -> List[Dict[str, Any]]:
        """Load all users from single users.json file"""
        if not self.container_client:
            print("Warning: Azure Storage not initialized")
            return []

        users_data = await self._load_json(self.USERS_FILE_PATH)
        if users_data is None:
            return []

        # Support both {"users": [...]} and [...] formats
        if isinstance(users_data, dict) and "users" in users_data:
            return users_data["users"]
        elif isinstance(users_data, list):
            return users_data
        else:
            return []

    async def _save_all_users(self, users: List[Dict[str, Any]]) -> bool:
        """Save all users to single users.json file"""
        users_data = {"users": users}
        return await self._save_json(self.USERS_FILE_PATH, users_data)

    async def save_user(self, user_id: str, user_data: Dict[str, Any]) -> bool:
        """Save user data to blob storage (single file)"""
        users = await self._load_all_users()

        # Find and update existing user, or add new user
        user_found = False
        for i, user in enumerate(users):
            if user.get("id") == user_id:
                users[i] = user_data
                user_found = True
                break

        if not user_found:
            users.append(user_data)

        return await self._save_all_users(users)

    async def get_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve user data from blob storage"""
        users = await self._load_all_users()
        for user in users:
            if user.get("id") == user_id:
                return user
        return None

    async def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Find user by email"""
        users = await self._load_all_users()
        for user in users:
            if user.get("email") == email:
                return user
        return None

    async def list_users(self) -> List[Dict[str, Any]]:
        """List all users"""
        return await self._load_all_users()

    async def delete_user(self, user_id: str) -> bool:
        """Delete user data"""
        users = await self._load_all_users()

        # Filter out the user to delete
        updated_users = [user for user in users if user.get("id") != user_id]

        if len(updated_users) == len(users):
            return False  # User not found

        return await self._save_all_users(updated_users)

    # Child Profile Management
    async def save_child_profile(
        self, user_id: str, child_id: str, profile_data: Dict[str, Any]
    ) -> bool:
        """Save child profile data"""
        blob_path = f"profiles/user_{user_id}/child_{child_id}.json"
        return await self._save_json(blob_path, profile_data)

    async def get_child_profile(
        self, user_id: str, child_id: str
    ) -> Optional[Dict[str, Any]]:
        """Retrieve child profile data"""
        blob_path = f"profiles/user_{user_id}/child_{child_id}.json"
        return await self._load_json(blob_path)

    async def list_child_profiles(self, user_id: str) -> List[Dict[str, Any]]:
        """List all child profiles for a user"""
        profiles = []
        prefix = f"profiles/user_{user_id}/"
        async for blob in self.container_client.list_blobs(name_starts_with=prefix):
            if blob.name.endswith(".json") and "music_elements" not in blob.name:
                profile_data = await self._load_json(blob.name)
                if profile_data:
                    profiles.append(profile_data)
        return profiles

    async def delete_child_profile(self, user_id: str, child_id: str) -> bool:
        """Delete child profile and associated data"""
        # Delete profile
        profile_path = f"profiles/user_{user_id}/child_{child_id}.json"
        await self._delete_blob(profile_path)

        # Delete music elements
        elements_path = f"profiles/user_{user_id}/child_{child_id}_music_elements.json"
        await self._delete_blob(elements_path)

        # Delete sessions (optional - you might want to keep for records)
        # await self.delete_child_sessions(child_id)

        return True

    # Document Management for Child Profiles
    async def upload_profile_document(
        self, user_id: str, child_id: str, filename: str, file_data: bytes, content_type: str
    ) -> Dict[str, Any]:
        """Upload a document for a child profile"""
        # Create safe filename
        import re
        safe_filename = re.sub(r'[^a-zA-Z0-9._-]', '_', filename)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_filename = f"{timestamp}_{safe_filename}"

        blob_path = f"documents/user_{user_id}/child_{child_id}/{unique_filename}"

        # Upload file
        success = await self.upload_file(blob_path, file_data, content_type)

        if success:
            return {
                "filename": filename,
                "blob_path": blob_path,
                "file_type": content_type,
                "file_size": len(file_data),
                "uploaded_at": datetime.now().isoformat()
            }
        else:
            raise Exception("Failed to upload document")

    async def delete_profile_document(
        self, user_id: str, child_id: str, blob_path: str
    ) -> bool:
        """Delete a document from a child profile"""
        # Verify the blob path belongs to the correct user and child
        expected_prefix = f"documents/user_{user_id}/child_{child_id}/"
        if not blob_path.startswith(expected_prefix):
            raise ValueError("Invalid document path")

        return await self._delete_blob(blob_path)

    async def list_profile_documents(
        self, user_id: str, child_id: str
    ) -> List[Dict[str, Any]]:
        """List all documents for a child profile"""
        documents = []
        prefix = f"documents/user_{user_id}/child_{child_id}/"

        try:
            async for blob in self.container_client.list_blobs(name_starts_with=prefix):
                blob_client = self.container_client.get_blob_client(blob.name)
                properties = await blob_client.get_blob_properties()

                documents.append({
                    "filename": blob.name.split("/")[-1],  # Extract filename
                    "blob_path": blob.name,
                    "file_type": properties.content_settings.content_type or "application/octet-stream",
                    "file_size": properties.size,
                    "uploaded_at": properties.last_modified.isoformat()
                })
        except Exception as e:
            print(f"Error listing documents: {e}")

        return documents

    # Music Element Analysis
    async def save_music_elements(
        self, user_id: str, child_id: str, elements_data: Dict[str, Any]
    ) -> bool:
        """Save GPT-generated music element analysis"""
        blob_path = f"profiles/user_{user_id}/child_{child_id}_music_elements.json"
        elements_data["analyzed_at"] = datetime.utcnow().isoformat()
        return await self._save_json(blob_path, elements_data)

    async def get_music_elements(
        self, user_id: str, child_id: str
    ) -> Optional[Dict[str, Any]]:
        """Retrieve music element analysis"""
        blob_path = f"profiles/user_{user_id}/child_{child_id}_music_elements.json"
        return await self._load_json(blob_path)

    # Session Management
    async def save_session(
        self, child_id: str, session_id: str, session_data: Dict[str, Any]
    ) -> bool:
        """Save session data"""
        blob_path = f"sessions/child_{child_id}/session_{session_id}.json"
        return await self._save_json(blob_path, session_data)

    async def get_session(
        self, child_id: str, session_id: str
    ) -> Optional[Dict[str, Any]]:
        """Retrieve session data"""
        blob_path = f"sessions/child_{child_id}/session_{session_id}.json"
        return await self._load_json(blob_path)

    async def find_session_by_id(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Find a session by session_id alone (scans all sessions)"""
        prefix = "sessions/"

        async for blob in self.container_client.list_blobs(name_starts_with=prefix):
            if blob.name.endswith(".json"):
                session_data = await self._load_json(blob.name)
                if session_data and session_data.get("id") == session_id:
                    return session_data

        return None

    async def list_child_sessions(self, child_id: str) -> List[Dict[str, Any]]:
        """List all sessions for a child"""
        sessions = []
        prefix = f"sessions/child_{child_id}/"
        async for blob in self.container_client.list_blobs(name_starts_with=prefix):
            if blob.name.endswith(".json"):
                session_data = await self._load_json(blob.name)
                if session_data:
                    sessions.append(session_data)
        return sessions

    async def list_user_sessions(self, user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """List all sessions for a user across all their children"""
        sessions = []
        prefix = "sessions/"

        async for blob in self.container_client.list_blobs(name_starts_with=prefix):
            if blob.name.endswith(".json"):
                session_data = await self._load_json(blob.name)
                if session_data and session_data.get("user_id") == user_id:
                    sessions.append(session_data)

                    # Stop if we've reached the limit
                    if len(sessions) >= limit:
                        break

        return sessions

    async def delete_session(self, child_id: str, session_id: str) -> bool:
        """Delete a single session"""
        blob_path = f"sessions/child_{child_id}/session_{session_id}.json"
        return await self._delete_blob(blob_path)

    async def delete_child_sessions(self, child_id: str) -> bool:
        """Delete all sessions for a child"""
        prefix = f"sessions/child_{child_id}/"
        async for blob in self.container_client.list_blobs(name_starts_with=prefix):
            await self._delete_blob(blob.name)
        return True

    # Music Management
    async def list_music_files(self, category: str = None) -> List[Dict[str, Any]]:
        """List all music files, optionally filtered by category"""
        music_files = []
        prefix = f"music/{category}/" if category else "music/"

        async for blob in self.container_client.list_blobs(name_starts_with=prefix):
            if blob.name.endswith(('.wav', '.mp3', '.ogg', '.m4a')):
                # Extract category from path: music/{category}/{filename}
                parts = blob.name.split('/')
                file_category = parts[1] if len(parts) > 1 else "unknown"
                filename = parts[-1]

                # Get metadata to check for additional categories
                blob_client = self.container_client.get_blob_client(blob.name)
                try:
                    blob_properties = await blob_client.get_blob_properties()
                    metadata = blob_properties.metadata or {}

                    # Parse categories from metadata (stored as comma-separated string)
                    categories_str = metadata.get('categories', file_category)
                    categories = [cat.strip() for cat in categories_str.split(',') if cat.strip()]
                except Exception as e:
                    print(f"Error getting metadata for {blob.name}: {e}")
                    categories = [file_category]

                music_files.append({
                    "name": filename,
                    "category": file_category,  # Primary category (from path)
                    "categories": categories,  # All categories
                    "blob_path": blob.name,
                    "size": blob.size,
                    "url": f"{self.container_client.url}/{blob.name}"
                })

        return music_files

    async def upload_music_file(
        self, category: str, filename: str, file_data: bytes, content_type: str = "audio/wav",
        categories: List[str] = None
    ) -> bool:
        """Upload a music file to Azure with optional multiple categories"""
        blob_path = f"music/{category}/{filename}"

        # If multiple categories provided, store as metadata
        if categories:
            metadata = {"categories": ",".join(categories)}
            return await self.upload_file_with_metadata(blob_path, file_data, content_type, metadata)
        else:
            return await self.upload_file(blob_path, file_data, content_type)

    async def download_music_file(self, category: str, filename: str) -> Optional[bytes]:
        """Download a music file from Azure"""
        blob_path = f"music/{category}/{filename}"
        return await self.download_file(blob_path)

    # File Upload (Music files, recordings, etc.)
    async def upload_file(
        self, blob_path: str, file_data: bytes, content_type: str = "application/octet-stream"
    ) -> bool:
        """Upload a file to blob storage"""
        try:
            blob_client = self.container_client.get_blob_client(blob_path)
            content_settings = ContentSettings(content_type=content_type)
            await blob_client.upload_blob(
                file_data, overwrite=True, content_settings=content_settings
            )
            return True
        except Exception as e:
            print(f"Error uploading file {blob_path}: {e}")
            return False

    async def upload_file_with_metadata(
        self, blob_path: str, file_data: bytes, content_type: str = "application/octet-stream",
        metadata: Dict[str, str] = None
    ) -> bool:
        """Upload a file to blob storage with metadata"""
        try:
            blob_client = self.container_client.get_blob_client(blob_path)
            content_settings = ContentSettings(content_type=content_type)
            await blob_client.upload_blob(
                file_data, overwrite=True, content_settings=content_settings, metadata=metadata
            )
            return True
        except Exception as e:
            print(f"Error uploading file {blob_path} with metadata: {e}")
            return False

    async def download_file(self, blob_path: str) -> Optional[bytes]:
        """Download a file from blob storage"""
        try:
            blob_client = self.container_client.get_blob_client(blob_path)
            download_stream = await blob_client.download_blob()
            return await download_stream.readall()
        except ResourceNotFoundError:
            return None
        except Exception as e:
            print(f"Error downloading file {blob_path}: {e}")
            return None

    async def get_file_url(self, blob_path: str, expiry_hours: int = 24) -> Optional[str]:
        """Get a temporary SAS URL for accessing a file"""
        # TODO: Implement SAS token generation for secure temporary access
        # For now, return the blob URL (container must be public for this to work)
        try:
            blob_client = self.container_client.get_blob_client(blob_path)
            return blob_client.url
        except Exception as e:
            print(f"Error getting file URL {blob_path}: {e}")
            return None

    # Email Verification Management
    async def save_verification_code(
        self, email: str, code: str, expires_at: str
    ) -> bool:
        """Save email verification code"""
        email_lower = email.lower()
        blob_path = f"verification/{email_lower.replace('@', '_at_').replace('.', '_')}.json"
        data = {
            "email": email_lower,
            "code": code,
            "expires_at": expires_at,
            "attempts": 0,
            "created_at": datetime.utcnow().isoformat()
        }
        return await self._save_json(blob_path, data)

    async def get_verification_code(self, email: str) -> Optional[Dict[str, Any]]:
        """Retrieve verification code data"""
        email_lower = email.lower()
        blob_path = f"verification/{email_lower.replace('@', '_at_').replace('.', '_')}.json"
        return await self._load_json(blob_path)

    async def update_verification_attempts(self, email: str, attempts: int) -> bool:
        """Update verification code attempts"""
        verification = await self.get_verification_code(email)
        if verification:
            verification["attempts"] = attempts
            email_lower = email.lower()
            blob_path = f"verification/{email_lower.replace('@', '_at_').replace('.', '_')}.json"
            return await self._save_json(blob_path, verification)
        return False

    async def delete_verification_code(self, email: str) -> bool:
        """Delete verification code"""
        email_lower = email.lower()
        blob_path = f"verification/{email_lower.replace('@', '_at_').replace('.', '_')}.json"
        return await self._delete_blob(blob_path)

    # Password Reset Management
    async def save_password_reset(
        self, email: str, token: str, expires_at: str
    ) -> bool:
        """Save password reset token"""
        blob_path = f"password_resets/token_{token}.json"
        data = {
            "email": email,
            "token": token,
            "expires_at": expires_at,
            "used": False,
            "created_at": datetime.utcnow().isoformat()
        }
        return await self._save_json(blob_path, data)

    async def get_password_reset(self, token: str) -> Optional[Dict[str, Any]]:
        """Retrieve password reset data by token"""
        blob_path = f"password_resets/token_{token}.json"
        return await self._load_json(blob_path)

    async def mark_reset_used(self, token: str) -> bool:
        """Mark password reset token as used"""
        reset_data = await self.get_password_reset(token)
        if reset_data:
            reset_data["used"] = True
            reset_data["used_at"] = datetime.utcnow().isoformat()
            blob_path = f"password_resets/token_{token}.json"
            return await self._save_json(blob_path, reset_data)
        return False

    async def delete_password_reset(self, token: str) -> bool:
        """Delete password reset token"""
        blob_path = f"password_resets/token_{token}.json"
        return await self._delete_blob(blob_path)

    # User Update Helper
    async def update_user(self, email: str, updates: Dict[str, Any]) -> bool:
        """Update specific user fields"""
        user = await self.get_user_by_email(email)
        if user:
            user.update(updates)
            user["updated_at"] = datetime.utcnow().isoformat()
            return await self.save_user(user["id"], user)
        return False

    # Helper methods
    async def save_json(self, blob_path: str, data: Dict[str, Any]) -> bool:
        """Public wrapper for _save_json"""
        return await self._save_json(blob_path, data)

    async def _save_json(self, blob_path: str, data: Dict[str, Any]) -> bool:
        """Save JSON data to blob storage"""
        try:
            json_data = json.dumps(data, indent=2)
            blob_client = self.container_client.get_blob_client(blob_path)
            content_settings = ContentSettings(content_type="application/json")
            await blob_client.upload_blob(
                json_data, overwrite=True, content_settings=content_settings
            )
            return True
        except Exception as e:
            print(f"Error saving JSON to {blob_path}: {e}")
            return False

    async def load_json(self, blob_path: str) -> Optional[Dict[str, Any]]:
        """Public wrapper for _load_json"""
        return await self._load_json(blob_path)

    async def _load_json(self, blob_path: str) -> Optional[Dict[str, Any]]:
        """Load JSON data from blob storage"""
        try:
            blob_client = self.container_client.get_blob_client(blob_path)
            download_stream = await blob_client.download_blob()
            json_data = await download_stream.readall()
            return json.loads(json_data)
        except ResourceNotFoundError:
            return None
        except Exception as e:
            print(f"Error loading JSON from {blob_path}: {e}")
            return None

    async def _delete_blob(self, blob_path: str) -> bool:
        """Delete a blob"""
        try:
            blob_client = self.container_client.get_blob_client(blob_path)
            await blob_client.delete_blob()
            return True
        except ResourceNotFoundError:
            return False
        except Exception as e:
            print(f"Error deleting blob {blob_path}: {e}")
            return False

    async def blob_exists(self, blob_path: str) -> bool:
        """Check if a blob exists"""
        try:
            blob_client = self.container_client.get_blob_client(blob_path)
            await blob_client.get_blob_properties()
            return True
        except ResourceNotFoundError:
            return False
        except Exception as e:
            print(f"Error checking blob existence {blob_path}: {e}")
            return False

    # ===================== PLANNED SESSIONS METHODS =====================

    async def save_planned_session(
        self, user_id: str, session_id: str, session_data: Dict[str, Any]
    ) -> bool:
        """Save planned session data"""
        blob_path = f"planned_sessions/user_{user_id}/{session_id}.json"
        return await self._save_json(blob_path, session_data)

    async def get_planned_session(
        self, user_id: str, session_id: str
    ) -> Optional[Dict[str, Any]]:
        """Retrieve a specific planned session"""
        blob_path = f"planned_sessions/user_{user_id}/{session_id}.json"
        return await self._load_json(blob_path)

    async def get_planned_sessions(
        self, user_id: str, child_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get all planned sessions for a user, optionally filtered by child"""
        sessions = []
        prefix = f"planned_sessions/user_{user_id}/"

        async for blob in self.container_client.list_blobs(name_starts_with=prefix):
            if blob.name.endswith(".json"):
                session_data = await self._load_json(blob.name)
                if session_data:
                    # Filter by child_id if provided
                    if child_id is None or session_data.get("childId") == child_id:
                        sessions.append(session_data)

        # Sort by scheduled date time
        sessions.sort(key=lambda x: x.get("scheduledDateTime", ""))
        return sessions

    async def get_upcoming_planned_sessions(
        self, user_id: str, child_id: str
    ) -> List[Dict[str, Any]]:
        """Get upcoming planned sessions for a specific child"""
        all_sessions = await self.get_planned_sessions(user_id, child_id)

        # Filter for upcoming status only
        upcoming = [s for s in all_sessions if s.get("status") == "upcoming"]

        # Sort by scheduled date time
        upcoming.sort(key=lambda x: x.get("scheduledDateTime", ""))
        return upcoming

    async def delete_planned_session(self, user_id: str, session_id: str) -> bool:
        """Delete a planned session"""
        blob_path = f"planned_sessions/user_{user_id}/{session_id}.json"
        return await self._delete_blob(blob_path)

    # ===================== SESSION TEMPLATES =====================

    async def save_session_template(
        self, user_id: str, template_id: str, template_data: Dict[str, Any]
    ) -> bool:
        """Save session template data"""
        blob_path = f"session_templates/user_{user_id}/{template_id}.json"
        return await self._save_json(blob_path, template_data)

    async def get_session_template(
        self, user_id: str, template_id: str
    ) -> Optional[Dict[str, Any]]:
        """Retrieve a specific session template"""
        blob_path = f"session_templates/user_{user_id}/{template_id}.json"
        return await self._load_json(blob_path)

    async def get_session_templates(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all session templates for a user"""
        templates = []
        prefix = f"session_templates/user_{user_id}/"

        async for blob in self.container_client.list_blobs(name_starts_with=prefix):
            if blob.name.endswith(".json"):
                template_data = await self._load_json(blob.name)
                if template_data:
                    templates.append(template_data)

        # Sort by created date (newest first)
        templates.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        return templates

    async def delete_session_template(self, user_id: str, template_id: str) -> bool:
        """Delete a session template"""
        blob_path = f"session_templates/user_{user_id}/{template_id}.json"
        return await self._delete_blob(blob_path)


# Singleton instance
azure_storage = AzureStorageService()
