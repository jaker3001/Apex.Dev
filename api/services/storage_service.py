"""
File storage service using Supabase Storage.

Manages file uploads, downloads, and deletions with proper organization.
"""
from typing import Dict, Any, Optional
from pathlib import Path
import uuid
from fastapi import UploadFile
from supabase import Client
from api.services.supabase_client import get_client
from api.services.supabase_errors import handle_supabase_error, DatabaseError
import logging

logger = logging.getLogger("apex_assistant.service.storage")


class StorageService:
    """Service for managing file uploads with Supabase Storage."""

    def __init__(self):
        self.client: Client = get_client()
        self.bucket = "apex-files"

    async def upload_file(
        self,
        file: UploadFile,
        user_id: str,
        folder: str = "chat",
        job_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Upload file to Supabase Storage.

        Args:
            file: Uploaded file
            user_id: User UUID for path organization
            folder: Folder within bucket (chat, estimates, receipts, media)
            job_id: Optional job ID for job-specific files

        Returns:
            Dict with file metadata (id, path, url, size, mime_type)

        Raises:
            DatabaseError if upload fails
        """
        try:
            file_id = str(uuid.uuid4())
            extension = Path(file.filename).suffix

            # Build file path based on context
            if job_id:
                file_path = f"{folder}/job_{job_id}/{file_id}{extension}"
            else:
                file_path = f"{folder}/user_{user_id}/{file_id}{extension}"

            # Read file content
            content = await file.read()

            # Upload to Supabase Storage
            result = self.client.storage.from_(self.bucket).upload(
                file_path,
                content,
                file_options={
                    "content-type": file.content_type or "application/octet-stream",
                    "cache-control": "3600",
                    "upsert": "false",
                }
            )

            if not result:
                raise DatabaseError("File upload returned no result")

            # Get public URL
            url = self.client.storage.from_(self.bucket).get_public_url(file_path)

            logger.info(f"File uploaded: {file_path} ({len(content)} bytes)")

            return {
                "id": file_id,
                "path": file_path,
                "url": url,
                "size": len(content),
                "mime_type": file.content_type,
                "filename": file.filename,
            }

        except Exception as e:
            logger.error(f"File upload failed: {e}")
            raise handle_supabase_error(e)

    async def delete_file(self, file_path: str) -> bool:
        """
        Delete file from storage.

        Args:
            file_path: Path to file in storage

        Returns:
            True if deleted, False otherwise
        """
        try:
            self.client.storage.from_(self.bucket).remove([file_path])
            logger.info(f"File deleted: {file_path}")
            return True
        except Exception as e:
            logger.error(f"File deletion failed for {file_path}: {e}")
            return False

    async def get_file_url(self, file_path: str) -> str:
        """
        Get public URL for a file.

        Args:
            file_path: Path to file in storage

        Returns:
            Public URL
        """
        try:
            return self.client.storage.from_(self.bucket).get_public_url(file_path)
        except Exception as e:
            logger.error(f"Failed to get URL for {file_path}: {e}")
            raise handle_supabase_error(e)

    async def create_signed_url(
        self,
        file_path: str,
        expires_in: int = 3600,
    ) -> Dict[str, str]:
        """
        Create a signed URL for temporary file access.

        Args:
            file_path: Path to file in storage
            expires_in: Expiration time in seconds (default: 1 hour)

        Returns:
            Dict with signed_url and expires_at
        """
        try:
            result = self.client.storage.from_(self.bucket).create_signed_url(
                file_path,
                expires_in
            )

            return {
                "signed_url": result.get("signedURL"),
                "expires_in": expires_in,
            }
        except Exception as e:
            logger.error(f"Failed to create signed URL for {file_path}: {e}")
            raise handle_supabase_error(e)

    async def list_files(
        self,
        folder: str,
        limit: int = 100,
        offset: int = 0,
    ) -> list:
        """
        List files in a folder.

        Args:
            folder: Folder path
            limit: Max results
            offset: Skip N results

        Returns:
            List of file metadata
        """
        try:
            result = self.client.storage.from_(self.bucket).list(
                folder,
                {
                    "limit": limit,
                    "offset": offset,
                }
            )

            return result

        except Exception as e:
            logger.error(f"Failed to list files in {folder}: {e}")
            raise handle_supabase_error(e)

    async def get_file_info(self, file_path: str) -> Dict[str, Any]:
        """
        Get file metadata.

        Args:
            file_path: Path to file in storage

        Returns:
            Dict with file metadata
        """
        try:
            # Note: Supabase doesn't have a direct get_info method
            # We'll need to list the parent folder and find the file
            folder = str(Path(file_path).parent)
            filename = Path(file_path).name

            files = await self.list_files(folder)

            for file in files:
                if file.get("name") == filename:
                    return {
                        "name": file.get("name"),
                        "id": file.get("id"),
                        "size": file.get("metadata", {}).get("size"),
                        "mime_type": file.get("metadata", {}).get("mimetype"),
                        "created_at": file.get("created_at"),
                        "updated_at": file.get("updated_at"),
                    }

            raise DatabaseError(f"File not found: {file_path}")

        except Exception as e:
            logger.error(f"Failed to get file info for {file_path}: {e}")
            raise handle_supabase_error(e)
