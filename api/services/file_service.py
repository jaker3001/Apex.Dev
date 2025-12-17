"""
File Upload and Processing Service

Handles file uploads, storage, and content extraction for chat.
Supports text files, images, and PDFs.
"""

import logging
import os
import uuid
import shutil
import mimetypes
from pathlib import Path
from typing import Optional
from dataclasses import dataclass

logger = logging.getLogger("apex_assistant.files")

# PDF extraction
try:
    from pypdf import PdfReader
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False

# Image processing (for validation/metadata)
try:
    from PIL import Image
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False


# Supported file types
TEXT_EXTENSIONS = {".txt", ".py", ".js", ".ts", ".jsx", ".tsx", ".json", ".md", ".csv", ".yaml", ".yml", ".xml", ".html", ".css", ".sql", ".sh", ".bat", ".ps1", ".log", ".ini", ".cfg"}
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp"}
PDF_EXTENSIONS = {".pdf"}

ALLOWED_EXTENSIONS = TEXT_EXTENSIONS | IMAGE_EXTENSIONS | PDF_EXTENSIONS

# Max file sizes
MAX_TEXT_SIZE = 10 * 1024 * 1024  # 10 MB
MAX_IMAGE_SIZE = 20 * 1024 * 1024  # 20 MB
MAX_PDF_SIZE = 50 * 1024 * 1024  # 50 MB


@dataclass
class UploadedFile:
    """Represents an uploaded file."""
    id: str
    original_name: str
    stored_path: str
    file_type: str  # "text", "image", "pdf"
    mime_type: str
    size: int
    extracted_text: Optional[str] = None
    metadata: Optional[dict] = None


class FileService:
    """Service for handling file uploads and processing."""

    def __init__(self, upload_dir: Optional[Path] = None):
        """
        Initialize file service.

        Args:
            upload_dir: Directory to store uploads. Defaults to ./uploads
        """
        self.upload_dir = upload_dir or Path("uploads")
        self.upload_dir.mkdir(parents=True, exist_ok=True)

    def _get_file_type(self, extension: str) -> Optional[str]:
        """Determine file type from extension."""
        ext_lower = extension.lower()
        if ext_lower in TEXT_EXTENSIONS:
            return "text"
        elif ext_lower in IMAGE_EXTENSIONS:
            return "image"
        elif ext_lower in PDF_EXTENSIONS:
            return "pdf"
        return None

    def _validate_file(self, filename: str, size: int) -> tuple[bool, str]:
        """
        Validate a file for upload.

        Returns:
            Tuple of (is_valid, error_message)
        """
        ext = Path(filename).suffix.lower()

        if ext not in ALLOWED_EXTENSIONS:
            return False, f"File type '{ext}' not allowed. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}"

        file_type = self._get_file_type(ext)

        if file_type == "text" and size > MAX_TEXT_SIZE:
            return False, f"Text files must be under {MAX_TEXT_SIZE // (1024*1024)} MB"
        elif file_type == "image" and size > MAX_IMAGE_SIZE:
            return False, f"Images must be under {MAX_IMAGE_SIZE // (1024*1024)} MB"
        elif file_type == "pdf" and size > MAX_PDF_SIZE:
            return False, f"PDFs must be under {MAX_PDF_SIZE // (1024*1024)} MB"

        return True, ""

    def _extract_text_from_pdf(self, file_path: Path) -> Optional[str]:
        """Extract text content from a PDF file."""
        if not PDF_AVAILABLE:
            return None

        try:
            reader = PdfReader(str(file_path))
            text_parts = []
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    text_parts.append(text)
            return "\n\n".join(text_parts) if text_parts else None
        except Exception as e:
            logger.warning(f"PDF extraction failed: {e}")
            return None

    def _extract_text_from_file(self, file_path: Path) -> Optional[str]:
        """Read text content from a text file."""
        try:
            with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                return f.read()
        except Exception as e:
            logger.warning(f"Text extraction failed: {e}")
            return None

    def _get_image_metadata(self, file_path: Path) -> Optional[dict]:
        """Get metadata from an image file."""
        if not PIL_AVAILABLE:
            return None

        try:
            with Image.open(file_path) as img:
                return {
                    "width": img.width,
                    "height": img.height,
                    "format": img.format,
                    "mode": img.mode,
                }
        except Exception as e:
            logger.warning(f"Image metadata extraction failed: {e}")
            return None

    async def save_upload(self, filename: str, content: bytes, session_id: str) -> UploadedFile:
        """
        Save an uploaded file and extract content.

        Args:
            filename: Original filename
            content: File content as bytes
            session_id: Chat session ID for organizing uploads

        Returns:
            UploadedFile object with file info and extracted text

        Raises:
            ValueError: If file validation fails
        """
        # Validate
        is_valid, error = self._validate_file(filename, len(content))
        if not is_valid:
            raise ValueError(error)

        # Generate unique ID and storage path
        file_id = str(uuid.uuid4())
        ext = Path(filename).suffix.lower()
        session_dir = self.upload_dir / session_id
        session_dir.mkdir(parents=True, exist_ok=True)
        stored_path = session_dir / f"{file_id}{ext}"

        # Save file
        with open(stored_path, "wb") as f:
            f.write(content)

        # Determine file type and MIME
        file_type = self._get_file_type(ext) or "unknown"
        mime_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"

        # Extract content based on type
        extracted_text = None
        metadata = None

        if file_type == "text":
            extracted_text = self._extract_text_from_file(stored_path)
        elif file_type == "pdf":
            extracted_text = self._extract_text_from_pdf(stored_path)
        elif file_type == "image":
            metadata = self._get_image_metadata(stored_path)

        return UploadedFile(
            id=file_id,
            original_name=filename,
            stored_path=str(stored_path),
            file_type=file_type,
            mime_type=mime_type,
            size=len(content),
            extracted_text=extracted_text,
            metadata=metadata,
        )

    def get_file(self, file_id: str, session_id: str) -> Optional[Path]:
        """
        Get the path to an uploaded file.

        Args:
            file_id: The file's unique ID
            session_id: Chat session ID

        Returns:
            Path to the file, or None if not found
        """
        session_dir = self.upload_dir / session_id
        if not session_dir.exists():
            return None

        # Find file with matching ID (any extension)
        for file_path in session_dir.iterdir():
            if file_path.stem == file_id:
                return file_path
        return None

    def delete_file(self, file_id: str, session_id: str) -> bool:
        """
        Delete an uploaded file.

        Args:
            file_id: The file's unique ID
            session_id: Chat session ID

        Returns:
            True if deleted, False if not found
        """
        file_path = self.get_file(file_id, session_id)
        if file_path and file_path.exists():
            file_path.unlink()
            return True
        return False

    def cleanup_session(self, session_id: str) -> None:
        """
        Delete all files for a session.

        Args:
            session_id: Chat session ID to clean up
        """
        session_dir = self.upload_dir / session_id
        if session_dir.exists():
            shutil.rmtree(session_dir)

    def get_file_content_for_message(self, uploaded_file: UploadedFile) -> dict:
        """
        Format file content for inclusion in a chat message.

        For text/PDF: Returns extracted text
        For images: Returns path reference (Claude will process via vision API)

        Args:
            uploaded_file: The uploaded file object

        Returns:
            Dict with file info formatted for chat message
        """
        result = {
            "id": uploaded_file.id,
            "name": uploaded_file.original_name,
            "type": uploaded_file.file_type,
            "mime_type": uploaded_file.mime_type,
            "size": uploaded_file.size,
        }

        if uploaded_file.file_type in ("text", "pdf") and uploaded_file.extracted_text:
            # Truncate very long text
            text = uploaded_file.extracted_text
            if len(text) > 50000:
                text = text[:50000] + "\n\n[Content truncated - file too large]"
            result["text_content"] = text
        elif uploaded_file.file_type == "image":
            result["image_path"] = uploaded_file.stored_path
            if uploaded_file.metadata:
                result["metadata"] = uploaded_file.metadata

        return result


# Global instance
_file_service: Optional[FileService] = None


def get_file_service(upload_dir: Optional[Path] = None) -> FileService:
    """Get or create the global file service instance."""
    global _file_service
    if _file_service is None:
        _file_service = FileService(upload_dir)
    return _file_service
