# backend/app/services/azure_blob_service.py

from typing import Optional, BinaryIO, List, Dict, Any, Tuple
import logging
from fastapi import UploadFile
from azure.storage.blob import BlobServiceClient, BlobClient, ContainerClient, ContentSettings
from azure.core.exceptions import ResourceExistsError, ResourceNotFoundError
from app.core.config import settings
from app.services.document_processor_service import document_processor
import json
from pathlib import Path
import io
import os
from datetime import datetime
import mimetypes
from pathlib import Path

logger = logging.getLogger(__name__)


class AzureBlobService:
    """Service for handling Azure Blob Storage operations across multiple containers."""

    def __init__(self):
        self.blob_service_client = None
        self._ensured_containers = set()  # Track which containers we've already checked

        if settings.azure_storage_connection_string:
            try:
                self.blob_service_client = BlobServiceClient.from_connection_string(
                    settings.azure_storage_connection_string
                )
                logger.info("Azure Blob Service initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Azure Blob Service: {str(e)}")

    def _ensure_container_exists(self, container_name: str):
        """Ensure the container exists, create if it doesn't."""
        if not self.blob_service_client:
            return

        # Skip if we've already ensured this container exists
        if container_name in self._ensured_containers:
            return

        try:
            container_client = self.blob_service_client.get_container_client(container_name)
            if not container_client.exists():
                self.blob_service_client.create_container(container_name)
                logger.info(f"Created container: {container_name}")
            self._ensured_containers.add(container_name)
        except ResourceExistsError:
            logger.info(f"Container already exists: {container_name}")
            self._ensured_containers.add(container_name)
        except Exception as e:
            logger.error(f"Error ensuring container exists: {str(e)}")

    def upload_file(self,
                   file_name: str,
                   file_data: BinaryIO,
                   container_name: Optional[str] = None,
                   overwrite: bool = True,
                   content_type="application/json") -> Optional[str]:
        """Upload a file to Azure Blob Storage."""
        if not self.blob_service_client:
            logger.warning("Azure Blob Service not configured")
            return None

        # Default to intake container if not specified
        if container_name is None:
            container_name = settings.azure_intake_container_name

        self._ensure_container_exists(container_name)

        try:
            blob_client = self.blob_service_client.get_blob_client(
                container=container_name,
                blob=file_name
            )
            blob_client.upload_blob(file_data, overwrite=overwrite)
            logger.info(f"Successfully uploaded {file_name} to container {container_name}")
            return blob_client.url
        except Exception as e:
            logger.error(f"Failed to upload file {file_name}: {str(e)}")
            return None

    def download_file(self,
                     file_name: str,
                     container_name: Optional[str] = None) -> Optional[bytes]:
        """Download a file from Azure Blob Storage."""
        if not self.blob_service_client:
            logger.warning("Azure Blob Service not configured")
            return None

        if container_name is None:
            container_name = settings.azure_intake_container_name

        try:
            blob_client = self.blob_service_client.get_blob_client(
                container=container_name,
                blob=file_name
            )
            return blob_client.download_blob().readall()
        except ResourceNotFoundError:
            # Don't log error for not found - it's expected in some cases
            return None
        except Exception as e:
            logger.error(f"Failed to download file {file_name}: {str(e)}")
            return None

    def delete_file(self,
                   file_name: str,
                   container_name: Optional[str] = None) -> bool:
        """Delete a file from Azure Blob Storage."""
        if not self.blob_service_client:
            logger.warning("Azure Blob Service not configured")
            return False

        if container_name is None:
            container_name = settings.azure_intake_container_name

        try:
            blob_client = self.blob_service_client.get_blob_client(
                container=container_name,
                blob=file_name
            )
            blob_client.delete_blob()
            logger.info(f"Successfully deleted {file_name} from container {container_name}")
            return True
        except ResourceNotFoundError:
            logger.warning(f"File not found for deletion: {file_name}")
            return False
        except Exception as e:
            logger.error(f"Failed to delete file {file_name}: {str(e)}")
            return False

    def file_exists(self,
                   file_name: str,
                   container_name: Optional[str] = None) -> bool:
        """Check if a file exists in Azure Blob Storage."""
        if not self.blob_service_client:
            return False

        if container_name is None:
            container_name = settings.azure_intake_container_name

        try:
            blob_client = self.blob_service_client.get_blob_client(
                container=container_name,
                blob=file_name
            )
            return blob_client.exists()
        except Exception as e:
            logger.error(f"Failed to check file existence {file_name}: {str(e)}")
            return False

    def list_files(self,
                  container_name: Optional[str] = None,
                  prefix: Optional[str] = None) -> List[str]:
        """List all files in a container with optional prefix filter."""
        if not self.blob_service_client:
            logger.warning("Azure Blob Service not configured")
            return []

        if container_name is None:
            container_name = settings.azure_intake_container_name

        try:
            container_client = self.blob_service_client.get_container_client(container_name)
            blobs = container_client.list_blobs(name_starts_with=prefix)
            return [blob.name for blob in blobs]
        except Exception as e:
            logger.error(f"Failed to list files in container {container_name}: {str(e)}")
            return []

    def move_file(self,
                 source_file: str,
                 dest_file: str,
                 source_container: Optional[str] = None,
                 dest_container: Optional[str] = None) -> bool:
        """Move a file between containers or rename within a container."""
        if not self.blob_service_client:
            logger.warning("Azure Blob Service not configured")
            return False

        if source_container is None:
            source_container = settings.azure_intake_container_name
        if dest_container is None:
            dest_container = source_container

        try:
            # Download from source
            source_blob = self.blob_service_client.get_blob_client(
                container=source_container,
                blob=source_file
            )
            data = source_blob.download_blob().readall()

            # Upload to destination
            self._ensure_container_exists(dest_container)
            dest_blob = self.blob_service_client.get_blob_client(
                container=dest_container,
                blob=dest_file
            )
            dest_blob.upload_blob(data, overwrite=True)

            # Delete source
            source_blob.delete_blob()

            logger.info(f"Moved {source_file} from {source_container} to {dest_file} in {dest_container}")
            return True
        except Exception as e:
            logger.error(f"Failed to move file: {str(e)}")
            return False

    def download_json(self, blob_path: str, container_name: str = None) -> dict:
        """
        Download and parse JSON content from blob storage

        Args:
            blob_path: Path to the blob file
            container_name: Container name (optional, defaults to intake container)

        Returns:
            Parsed JSON content as dictionary

        Raises:
            ResourceNotFoundError if blob not found
            Exception for other errors
        """
        if not self.blob_service_client:
            logger.warning("Azure Blob Service not configured")
            return None

        if not container_name:
            container_name = settings.azure_intake_container_name

        try:
            logger.info(f"Attempting to download JSON: container={container_name}, path={blob_path}")
            blob_client = self.blob_service_client.get_blob_client(
                container=container_name,
                blob=blob_path
            )

            # Download blob content
            blob_data = blob_client.download_blob()
            content = blob_data.readall()
            logger.info(f"Successfully downloaded {blob_path} ({len(content)} bytes)")

            # Parse JSON
            content_str = content if isinstance(content, str) else content.decode('utf-8')
            return json.loads(content_str)

        except ResourceNotFoundError:
            # Don't raise for not found - let caller handle it
            logger.warning(f"File not found in Azure: container={container_name}, path={blob_path}")
            return None
        except json.JSONDecodeError as e:
            logger.error(f"❌ INVALID JSON in file: {blob_path}")
            logger.error(f"   Container: {container_name}")
            logger.error(f"   Error: {e.msg} at line {e.lineno}, column {e.colno}")
            logger.error(f"   Position: character {e.pos}")
            # Try to show context around the error
            try:
                content_str = content if isinstance(content, str) else content.decode('utf-8')
                lines = content_str.split('\n')
                if e.lineno <= len(lines):
                    logger.error(f"   Problem line {e.lineno}: {lines[e.lineno - 1][:200]}")
                    if e.lineno > 1:
                        logger.error(f"   Previous line {e.lineno - 1}: {lines[e.lineno - 2][:200]}")
            except:
                pass
            logger.error(f"   ⚠️  Please fix the JSON syntax error in Azure Blob Storage file: {blob_path}")
            return None
        except Exception as e:
            logger.error(f"Failed to download JSON from {blob_path} in {container_name}: {str(e)}")
            return None

    async def upload_json(self, container_name: str, blob_name: str, data: str) -> bool:
        """
        Upload JSON data to blob storage

        Args:
            container_name: Container name
            blob_name: Blob path/name
            data: JSON string data

        Returns:
            True if successful, False otherwise
        """
        try:
            if not self.blob_service_client:
                logger.warning("Azure Blob Service not configured")
                return False

            self._ensure_container_exists(container_name)

            blob_client = self.blob_service_client.get_blob_client(
                container=container_name,
                blob=blob_name
            )

            content_settings = ContentSettings(content_type='application/json')

            # Upload as JSON with proper content type
            blob_client.upload_blob(
                data.encode('utf-8'),
                overwrite=True,
                content_settings=content_settings
            )

            logger.info(f"Successfully uploaded JSON to {blob_name} in {container_name}")
            return True

        except Exception as e:
            logger.error(f"Failed to upload JSON: {str(e)}")
            return False

    async def get_document_info(
        self,
        student_id: str,
        filename: str,
        container_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Retrieve document information and content by document ID.

        Args:
            filename: The document ID to retrieve
            student_id: The student ID
            container_name: Container name (optional)

        Returns:
            Dictionary containing document information and content, or empty dict if not found
        """
        container_name = container_name or settings.azure_intake_container_name

        try:
            # Get document metadata
            documents_path = f"students/{student_id}/documents.json"

            try:
                documents_data_ = self.download_json(documents_path, container_name)
                if isinstance(documents_data_, dict) and "documents" in documents_data_:
                    documents_data = documents_data_.get('documents', documents_data_)
                else:
                    documents_data = documents_data_
            except ResourceNotFoundError:
                logger.warning(f"documents.json not found for student {student_id}")
                return {}

            # Find document
            doc_info = next(
                (doc for doc in documents_data
                if doc.get("name") == filename),
                None
            )

            if not doc_info:
                logger.warning(f"Document {filename} not found in metadata")
                return {}


            file_extension = os.path.splitext(filename)[1] if '.' in filename else ''
            blob_path = f"students/{student_id}/documents/{filename}"

            # Download file
            try:
                blob_client = self.blob_service_client.get_blob_client(
                    container=container_name,
                    blob=blob_path
                )
                download_stream = blob_client.download_blob()
                file_content = download_stream.readall()
                blob_properties = blob_client.get_blob_properties()
            except ResourceNotFoundError:
                logger.warning(f"File not found: {blob_path}")
                return {}

            # Build response
            ai_summary = doc_info.get("ai_summary") or doc_info.get("aiSummary")

            return {
                "name": filename,
                "file_extension": file_extension,
                "size": blob_properties.size,
                "content": file_content,
                "extracted_text": doc_info.get("extracted_text", ""),
                "classifications": doc_info.get("classifications", {}),
                "ai_summary": ai_summary or {},
                "has_ai_summary": bool(ai_summary)
            }

        except Exception as e:
            logger.error(f"Error retrieving document {filename}: {str(e)}")
            return {}

    async def get_document_info_generic(
        self,
        blob_path: str,
        container_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Retrieve document information and content from blob storage

        Returns:
            Dictionary containing document information and content, or empty dict if not found
        """
        container_name = container_name or settings.azure_intake_container_name

        try:
            fname, ext = self.parse_filepath_(blob_path)

            try:
                blob_client = self.blob_service_client.get_blob_client(
                    container=container_name,
                    blob=blob_path
                )
                download_stream = blob_client.download_blob()
                file_content = download_stream.readall()
                blob_properties = blob_client.get_blob_properties()
            except ResourceNotFoundError:
                logger.warning(f"File not found: {blob_path}")
                return {}

            return {
                "name": fname,
                "file_extension": ext,
                "content": file_content,
                "size": blob_properties.size,
                "content_type": blob_properties.content_settings.content_type,  # MIME type
                "blob_path": blob_path,  # Full path for reference
                "last_modified": blob_properties.last_modified.isoformat(),  # When last updated
                "created_on": blob_properties.creation_time.isoformat() if blob_properties.creation_time else None,  # When created
                "etag": blob_properties.etag  # For versioning/caching
            }

        except Exception as e:
            logger.error(f"Error retrieving document info: {str(e)}")
            return {}

    def get_student_documents_json(self, student_id: str, container_name: Optional[str] = None) -> Dict[str, Any]:
        """
        Get all documents metadata for a student from documents.json

        Args:
            student_id: Student ID
            container_name: Container name (optional)

        Returns:
            Documents metadata dictionary
        """
        if container_name is None:
            container_name = settings.azure_user_container_name

        documents_path = f"students/{student_id}/documents.json"

        try: #get_document_info
            return self.download_json(documents_path, container_name)
        except ResourceNotFoundError:
            logger.warning(f"No documents.json found for student {student_id}")
            return {"documents": []}
        except Exception as e:
            logger.error(f"Error getting student documents metadata: {str(e)}")
            return {"documents": []}

    async def list_student_documents(
        self,
        student_id: str,
        document_types: Optional[List[str]] = None,
        container_name: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        List all documents for a student with optional type filtering

        Args:
            student_id: Student ID
            document_types: Optional list of document types to filter
            container_name: Container name (optional)

        Returns:
            List of document metadata dictionaries
        """
        # Get documents metadata from documents.json
        documents_meta = self.get_student_documents_json(student_id, container_name)
        documents = documents_meta.get("documents", [])

        # Filter by document types if specified
        if document_types:
            documents = [
                doc for doc in documents
                if doc.get("type") in document_types or doc.get("category") in document_types
            ]

        # Add file existence based on whether URL exists in metadata
        for doc in documents:
            # Simple existence check based on metadata
            doc["file_exists"] = bool(doc.get("url") or doc.get("exists", True))

            # Extract extension from name if available
            name = doc.get("name", "")
            if name and "." in name:
                doc["file_extension"] = os.path.splitext(name)[1]
            else:
                doc["file_extension"] = ""

        return documents

    async def upload_student_document(
        self,
        student_id: str,
        file_data: BinaryIO,
        filename: str,
        document_type: str,
        metadata: Optional[Dict[str, Any]] = None,
        container_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Upload a new document for a student and update documents.json

        Args:
            student_id: Student ID
            file_data: File content
            filename: Original filename (for display)
            document_type: Type/category of document
            metadata: Additional metadata
            container_name: Container name (optional)

        Returns:
            Document metadata including new document ID
        """
        if container_name is None:
            container_name = settings.azure_intake_container_name

        # Extract file extension from original filename
        file_extension = os.path.splitext(filename)[1].lower()

        # Upload the file with the original filename to maintain extension
        file_path = f"students/{student_id}/documents/{filename}"
        url = self.upload_file(file_path, file_data, container_name)

        if not url:
            raise Exception("Failed to upload document file")

        # Create document metadata
        document_meta = {
            "name": filename,  # Store original filename in 'name' field
            "type": document_type,
            "category": document_type,
            "file_extension": file_extension,
            "mime_type": mimetypes.guess_type(filename)[0] or "application/octet-stream",
            "uploaded_at": datetime.now().isoformat(),
            "url": url,
            "processed": False,
            **(metadata or {})
        }

        # Update documents.json
        documents_meta = self.get_student_documents_json(student_id, container_name)
        documents_meta.setdefault("documents", []).append(document_meta)

        # Save updated documents.json
        documents_path = f"students/{student_id}/documents.json"
        await self.upload_json(
            container_name,
            documents_path,
            json.dumps(documents_meta, indent=2)
        )

        logger.info(f"Uploaded document  ({filename}) for student {student_id}")
        return document_meta

    async def update_document_metadata(
        self,
        student_id: str,
        filename: str,
        metadata_updates: Dict[str, Any],
        container_name: Optional[str] = None
    ) -> bool:
        """
        Update metadata for a specific document

        Args:
            student_id: Student ID
            filename: Document name
            metadata_updates: Dictionary of metadata to update
            container_name: Container name (optional)

        Returns:
            True if successful, False otherwise
        """
        if container_name is None:
            container_name = settings.azure_intake_container_name

        documents_meta_ = self.get_student_documents_json(student_id, container_name)
        if isinstance(documents_meta_, dict) and "documents" in documents_meta_:
            documents_meta = documents_meta_.get('documents')
        else:
            documents_meta = documents_meta_

        updated = False
        for doc in documents_meta:
            if doc.get("name") == filename:
                doc.update(metadata_updates)
                doc["updated_at"] = datetime.now().isoformat()
                updated = True
                break

        if not updated:
            logger.error(f"Document {filename} not found for update")
            return False

        # Save updated documents.json
        documents_path = f"students/{student_id}/documents.json"
        success = await self.upload_json(
            container_name,
            documents_path,
            json.dumps(documents_meta, indent=2)
        )
        return success

    async def delete_student_document(
        self,
        student_id: str,
        filename: str,
        container_name: Optional[str] = None
    ) -> bool:
        """
        Delete a document for a student

        Args:
            student_id: Student ID
            document_id: Document name
            container_name: Container name (optional)

        Returns:
            True if successful, False otherwise
        """
        if container_name is None:
            container_name = settings.azure_intake_container_name

        # Get document info first to get the actual filename
        document_info = await  self.get_document_info(student_id, filename, container_name )
        if document_info:
            if document_info.get("name"):
                file_path = f"students/{student_id}/documents/{document_info['name']}"
                self.delete_file(file_path, container_name)

        documents_meta = self.get_student_documents_json(student_id, container_name)
        documents = documents_meta.get("documents", [])
        documents_meta["documents"] = [doc for doc in documents if doc.get("name") != filename]

        documents_path = f"students/{student_id}/documents.json"
        await self.upload_json(
            container_name,
            documents_path,
            json.dumps(documents_meta, indent=2)
        )

        logger.info(f"Deleted document {filename} for student {student_id}")
        return True

    async def process_student_document_with_mcp(
        self,
        student_id: str,
        filename: str,
        reprocess: bool = False,
        container_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Process a student document using MCP and store results

        Args:
            student_id: Student ID
            document_id: Document ID
            reprocess: Force reprocessing even if already processed
            container_name: Container name (optional)

        Returns:
            Processing results
        """
        # Get document
        document_data = await self.get_document_info(student_id, filename, container_name)
        if not document_data:
            raise ValueError(f"Document {filename} not found")

        llm_results = await document_processor.process_document(
            filename=filename,
            file_content=document_data.get('content'),
            file_extension=document_data.get("file_extension"),
            student_id=student_id
        )
        # Update document metadata
        if llm_results:
            extraction_data = llm_results.get('extraction_results', {}).get('data', "{}")
            classification_data = llm_results.get('classification_results', {}).get('data', "{}")
            summary_data = llm_results.get('ai_summary_results', {}).get('data', "{}")
            await self.update_document_metadata(
                student_id=student_id,
                filename=filename,
                metadata_updates={
                    "processed": True,
                    "processed_at": datetime.now().isoformat(),
                    "extraction_results": json.loads(extraction_data) if isinstance(extraction_data, str) else extraction_data,
                    "classification_results": json.loads(classification_data) if isinstance(classification_data, str) else classification_data,
                    "ai_summary_results": json.loads(summary_data) if isinstance(summary_data, str) else summary_data,
                    "has_ai_summary": True
                },
                container_name=container_name
            )

        return llm_results

    async def batch_process_student_documents(
        self,
        student_id: str,
        document_types: Optional[List[str]] = None,
        force_reprocess: bool = False,
        container_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Process multiple documents for a student

        Args:
            student_id: Student ID
            document_types: Optional list of document types to process
            force_reprocess: Force reprocessing even if already processed
            container_name: Container name (optional)

        Returns:
            Batch processing results
        """
        # Get all documents
        documents = await self.list_student_documents(student_id, document_types, container_name)

        results = []
        errors = []

        for doc in documents:
            filename = doc.get("name")
            if not filename:
                continue

            try:
                # Skip if already processed and not forcing
                if not force_reprocess and doc.get("processed"):
                    results.append({
                        "filename": filename,
                        "status": "already_processed",
                        "classification": doc.get("classification")
                    })
                    continue

                # Process document
                result = await self.process_student_document_with_mcp(
                    student_id=student_id,
                    filename=filename,
                    reprocess=force_reprocess,
                    container_name=container_name
                )

                results.append({
                    "filename": filename,
                    "status": "processed",
                    "classification": result.get("classification", {}).get("category"),
                    "confidence": result.get("classification", {}).get("confidence"),
                    "summary": result.get("summary")
                })

            except Exception as e:
                logger.error(f"Error processing document {filename}: {str(e)}")
                errors.append({
                    "filename": doc.get("name"),
                    "error": str(e)
                })

        return {
            "student_id": student_id,
            "total": len(documents),
            "processed": len(results),
            "errors": len(errors),
            "results": results,
            "error_details": errors
        }

    async def get_document_processing_status(
        self,
        student_id: str,
        container_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get processing status for all student documents

        Args:
            student_id: Student ID
            container_name: Container name (optional)

        Returns:
            Processing status summary
        """
        documents = await self.list_student_documents(student_id, container_name=container_name)

        total = len(documents)
        processed = sum(1 for doc in documents if doc.get("processed"))
        unprocessed = total - processed

        by_type = {}
        for doc in documents:
            doc_type = doc.get("type") or doc.get("category") or "unknown"
            if doc_type not in by_type:
                by_type[doc_type] = {"total": 0, "processed": 0}
            by_type[doc_type]["total"] += 1
            if doc.get("processed"):
                by_type[doc_type]["processed"] += 1

        return {
            "student_id": student_id,
            "total_documents": total,
            "processed": processed,
            "unprocessed": unprocessed,
            "percentage_complete": (processed / total * 100) if total > 0 else 0,
            "by_type": by_type,
            "documents": [
                {
                    "name": doc.get("name"),
                    "filename": doc.get("name"),
                    "type": doc.get("type") or doc.get("category"),
                    "file_extension": doc.get("file_extension", ""),
                    "processed": doc.get("processed", False),
                    "processed_at": doc.get("processed_at"),
                    "classification": doc.get("classification"),
                    "confidence": doc.get("confidence"),
                    "aiSummary": doc.get("aiSummary"),
                    "file_exists": doc.get("file_exists", False)
                }
                for doc in documents
            ]
        }


    async def process_document_with_mcp_generic(
        self,
        filename: str, # files name. in azure. full path except container name
        container_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
            Three steps: content in byetes, extract text, then ai (tool, prompt etc. )
        """
        # process_document_extract_text
        # process_document_ai

        # Get document
        document_data = await self.get_document_info_generic(filename, container_name)
        if not document_data:
            raise ValueError(f"Document {filename} not found")

        llm_results = await document_processor.process_document_generic(
            filename=filename,
            file_content=document_data.get('content'),
            file_extension=document_data.get("file_extension")
        )

        return llm_results

    def parse_filepath_(self, file_path: str) -> tuple[str, str]:
        path = Path(file_path)
        return path.name, path.suffix.lower().lstrip('.')


# Create singleton instance
azure_blob_service = AzureBlobService()