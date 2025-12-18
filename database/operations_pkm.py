"""
PKM Database Operations

Handles CRUD operations for PKM notes, combining:
- File system operations (actual .md files)
- Database operations (metadata index)
"""

import json
import os
import re
from datetime import datetime
from pathlib import Path
from typing import Optional

from .schema_pkm import get_connection

# Base path for PKM storage
UPLOADS_PATH = Path(__file__).parent.parent / "uploads"
PKM_BASE = UPLOADS_PATH / "pkm"


def get_user_pkm_path(user_id: int) -> Path:
    """Get the PKM root directory for a user."""
    path = PKM_BASE / str(user_id)
    path.mkdir(parents=True, exist_ok=True)
    return path


def normalize_path(file_path: str) -> str:
    """Normalize a file path (forward slashes, no leading slash)."""
    normalized = file_path.replace("\\", "/").strip("/")
    # Ensure .md extension
    if not normalized.endswith(".md"):
        normalized += ".md"
    return normalized


def extract_title(content: str, file_path: str) -> str:
    """Extract title from content (first H1) or filename."""
    # Try to find first H1 heading
    match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
    if match:
        return match.group(1).strip()

    # Fall back to filename without extension
    filename = Path(file_path).stem
    # Convert kebab-case or snake_case to Title Case
    title = filename.replace("-", " ").replace("_", " ")
    return title.title()


def extract_links(content: str) -> tuple[list[str], list[str]]:
    """Extract wiki links and job links from content.

    Returns:
        (note_links, job_links) - Lists of linked note paths and job numbers
    """
    note_links = []
    job_links = []

    # Find all [[...]] patterns
    for match in re.finditer(r'\[\[([^\]]+)\]\]', content):
        link = match.group(1).strip()

        if link.startswith("job:"):
            # Job link: [[job:202512-001]]
            job_number = link[4:].strip()
            if job_number and job_number not in job_links:
                job_links.append(job_number)
        else:
            # Note link: [[note-name]] or [[folder/note-name]]
            normalized = normalize_path(link)
            if normalized not in note_links:
                note_links.append(normalized)

    return note_links, job_links


def get_content_preview(content: str, max_length: int = 200) -> str:
    """Get a preview of the content for display."""
    # Remove H1 heading if present (already shown as title)
    content = re.sub(r'^#\s+.+\n*', '', content, count=1)
    # Remove other markdown formatting
    preview = re.sub(r'[#*_`\[\]]', '', content)
    # Collapse whitespace
    preview = ' '.join(preview.split())
    # Truncate
    if len(preview) > max_length:
        preview = preview[:max_length].rsplit(' ', 1)[0] + '...'
    return preview


def count_words(content: str) -> int:
    """Count words in content."""
    # Remove markdown formatting
    text = re.sub(r'[#*_`\[\]\(\)]', ' ', content)
    words = text.split()
    return len(words)


# =============================================================================
# FILE SYSTEM OPERATIONS
# =============================================================================

def list_files_recursive(user_id: int) -> list[dict]:
    """List all files and folders in user's PKM directory."""
    user_path = get_user_pkm_path(user_id)
    items = []

    for root, dirs, files in os.walk(user_path):
        rel_root = Path(root).relative_to(user_path)

        # Skip hidden directories
        dirs[:] = [d for d in dirs if not d.startswith('.')]

        # Add folders
        for dir_name in sorted(dirs):
            rel_path = str(rel_root / dir_name).replace("\\", "/")
            if rel_path == ".":
                rel_path = dir_name
            items.append({
                "type": "folder",
                "name": dir_name,
                "path": rel_path,
            })

        # Add markdown files
        for file_name in sorted(files):
            if file_name.endswith('.md') and not file_name.startswith('.'):
                rel_path = str(rel_root / file_name).replace("\\", "/")
                if rel_path.startswith("./"):
                    rel_path = rel_path[2:]
                items.append({
                    "type": "file",
                    "name": file_name,
                    "path": rel_path,
                })

    return items


def read_note_file(user_id: int, file_path: str) -> Optional[str]:
    """Read a note file's content."""
    user_path = get_user_pkm_path(user_id)
    full_path = user_path / normalize_path(file_path)

    if not full_path.exists():
        return None

    # Security check: ensure path is within user's directory
    try:
        full_path.resolve().relative_to(user_path.resolve())
    except ValueError:
        return None  # Path traversal attempt

    return full_path.read_text(encoding='utf-8')


def write_note_file(user_id: int, file_path: str, content: str) -> bool:
    """Write content to a note file."""
    user_path = get_user_pkm_path(user_id)
    normalized = normalize_path(file_path)
    full_path = user_path / normalized

    # Security check
    try:
        full_path.resolve().relative_to(user_path.resolve())
    except ValueError:
        return False

    # Create parent directories if needed
    full_path.parent.mkdir(parents=True, exist_ok=True)

    full_path.write_text(content, encoding='utf-8')
    return True


def delete_note_file(user_id: int, file_path: str) -> bool:
    """Delete a note file."""
    user_path = get_user_pkm_path(user_id)
    full_path = user_path / normalize_path(file_path)

    if not full_path.exists():
        return False

    # Security check
    try:
        full_path.resolve().relative_to(user_path.resolve())
    except ValueError:
        return False

    full_path.unlink()
    return True


def create_folder(user_id: int, folder_path: str) -> bool:
    """Create a folder in user's PKM directory."""
    user_path = get_user_pkm_path(user_id)
    full_path = user_path / folder_path.replace("\\", "/").strip("/")

    # Security check
    try:
        full_path.resolve().relative_to(user_path.resolve())
    except ValueError:
        return False

    full_path.mkdir(parents=True, exist_ok=True)
    return True


def delete_folder(user_id: int, folder_path: str) -> bool:
    """Delete an empty folder."""
    user_path = get_user_pkm_path(user_id)
    full_path = user_path / folder_path.replace("\\", "/").strip("/")

    if not full_path.exists() or not full_path.is_dir():
        return False

    # Security check
    try:
        full_path.resolve().relative_to(user_path.resolve())
    except ValueError:
        return False

    # Only delete if empty
    if any(full_path.iterdir()):
        return False

    full_path.rmdir()
    return True


# =============================================================================
# DATABASE OPERATIONS
# =============================================================================

def upsert_note_metadata(
    user_id: int,
    file_path: str,
    content: str,
) -> dict:
    """Create or update note metadata in the database."""
    conn = get_connection()
    cursor = conn.cursor()

    normalized = normalize_path(file_path)
    title = extract_title(content, normalized)
    note_links, job_links = extract_links(content)
    preview = get_content_preview(content)
    word_count = count_words(content)
    now = datetime.utcnow().isoformat()

    # Check if note exists
    cursor.execute(
        "SELECT id FROM pkm_notes WHERE user_id = ? AND file_path = ?",
        (user_id, normalized)
    )
    existing = cursor.fetchone()

    if existing:
        # Update
        cursor.execute("""
            UPDATE pkm_notes SET
                title = ?,
                updated_at = ?,
                word_count = ?,
                links_to = ?,
                linked_jobs = ?,
                content_preview = ?
            WHERE user_id = ? AND file_path = ?
        """, (
            title,
            now,
            word_count,
            json.dumps(note_links),
            json.dumps(job_links),
            preview,
            user_id,
            normalized
        ))
        note_id = existing['id']
    else:
        # Insert
        cursor.execute("""
            INSERT INTO pkm_notes (
                user_id, file_path, title, created_at, updated_at,
                word_count, links_to, linked_jobs, content_preview
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            user_id, normalized, title, now, now,
            word_count, json.dumps(note_links), json.dumps(job_links), preview
        ))
        note_id = cursor.lastrowid

    conn.commit()

    # Update backlinks for linked notes
    update_backlinks(user_id, normalized, note_links)

    # Fetch and return the note
    cursor.execute(
        "SELECT * FROM pkm_notes WHERE id = ?",
        (note_id,)
    )
    row = cursor.fetchone()
    conn.close()

    return dict(row) if row else {}


def update_backlinks(user_id: int, source_path: str, linked_paths: list[str]):
    """Update the linked_from field on notes that are linked to."""
    conn = get_connection()
    cursor = conn.cursor()

    for linked_path in linked_paths:
        # Get current backlinks for the target note
        cursor.execute(
            "SELECT linked_from FROM pkm_notes WHERE user_id = ? AND file_path = ?",
            (user_id, linked_path)
        )
        row = cursor.fetchone()

        if row:
            backlinks = json.loads(row['linked_from'] or '[]')
            if source_path not in backlinks:
                backlinks.append(source_path)
                cursor.execute(
                    "UPDATE pkm_notes SET linked_from = ? WHERE user_id = ? AND file_path = ?",
                    (json.dumps(backlinks), user_id, linked_path)
                )

    conn.commit()
    conn.close()


def get_note_metadata(user_id: int, file_path: str) -> Optional[dict]:
    """Get note metadata from database."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT * FROM pkm_notes WHERE user_id = ? AND file_path = ?",
        (user_id, normalize_path(file_path))
    )
    row = cursor.fetchone()
    conn.close()

    if row:
        result = dict(row)
        # Parse JSON fields
        result['links_to'] = json.loads(result.get('links_to') or '[]')
        result['linked_from'] = json.loads(result.get('linked_from') or '[]')
        result['linked_jobs'] = json.loads(result.get('linked_jobs') or '[]')
        return result

    return None


def list_notes_metadata(
    user_id: int,
    folder: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
) -> list[dict]:
    """List note metadata from database."""
    conn = get_connection()
    cursor = conn.cursor()

    if folder:
        # Filter by folder prefix
        folder_prefix = folder.rstrip('/') + '/'
        cursor.execute("""
            SELECT * FROM pkm_notes
            WHERE user_id = ? AND file_path LIKE ?
            ORDER BY updated_at DESC
            LIMIT ? OFFSET ?
        """, (user_id, folder_prefix + '%', limit, offset))
    else:
        cursor.execute("""
            SELECT * FROM pkm_notes
            WHERE user_id = ?
            ORDER BY updated_at DESC
            LIMIT ? OFFSET ?
        """, (user_id, limit, offset))

    rows = cursor.fetchall()
    conn.close()

    result = []
    for row in rows:
        note = dict(row)
        note['links_to'] = json.loads(note.get('links_to') or '[]')
        note['linked_from'] = json.loads(note.get('linked_from') or '[]')
        note['linked_jobs'] = json.loads(note.get('linked_jobs') or '[]')
        result.append(note)

    return result


def delete_note_metadata(user_id: int, file_path: str) -> bool:
    """Delete note metadata from database."""
    conn = get_connection()
    cursor = conn.cursor()

    normalized = normalize_path(file_path)

    # First, get the note's links so we can update backlinks
    cursor.execute(
        "SELECT links_to FROM pkm_notes WHERE user_id = ? AND file_path = ?",
        (user_id, normalized)
    )
    row = cursor.fetchone()

    if row:
        # Remove this note from backlinks of linked notes
        links_to = json.loads(row['links_to'] or '[]')
        for linked_path in links_to:
            cursor.execute(
                "SELECT linked_from FROM pkm_notes WHERE user_id = ? AND file_path = ?",
                (user_id, linked_path)
            )
            linked_row = cursor.fetchone()
            if linked_row:
                backlinks = json.loads(linked_row['linked_from'] or '[]')
                if normalized in backlinks:
                    backlinks.remove(normalized)
                    cursor.execute(
                        "UPDATE pkm_notes SET linked_from = ? WHERE user_id = ? AND file_path = ?",
                        (json.dumps(backlinks), user_id, linked_path)
                    )

    # Delete the note metadata
    cursor.execute(
        "DELETE FROM pkm_notes WHERE user_id = ? AND file_path = ?",
        (user_id, normalized)
    )

    affected = cursor.rowcount
    conn.commit()
    conn.close()

    return affected > 0


def search_notes(
    user_id: int,
    query: str,
    limit: int = 20,
) -> list[dict]:
    """Search notes by title or content preview."""
    conn = get_connection()
    cursor = conn.cursor()

    search_term = f"%{query}%"
    cursor.execute("""
        SELECT * FROM pkm_notes
        WHERE user_id = ? AND (title LIKE ? OR content_preview LIKE ?)
        ORDER BY updated_at DESC
        LIMIT ?
    """, (user_id, search_term, search_term, limit))

    rows = cursor.fetchall()
    conn.close()

    result = []
    for row in rows:
        note = dict(row)
        note['links_to'] = json.loads(note.get('links_to') or '[]')
        note['linked_from'] = json.loads(note.get('linked_from') or '[]')
        note['linked_jobs'] = json.loads(note.get('linked_jobs') or '[]')
        result.append(note)

    return result


def get_backlinks(user_id: int, file_path: str) -> list[dict]:
    """Get all notes that link to the specified note."""
    note = get_note_metadata(user_id, file_path)
    if not note:
        return []

    backlink_paths = note.get('linked_from', [])
    if not backlink_paths:
        return []

    conn = get_connection()
    cursor = conn.cursor()

    # Fetch metadata for all backlinks
    placeholders = ','.join('?' * len(backlink_paths))
    cursor.execute(f"""
        SELECT * FROM pkm_notes
        WHERE user_id = ? AND file_path IN ({placeholders})
        ORDER BY title
    """, [user_id] + backlink_paths)

    rows = cursor.fetchall()
    conn.close()

    result = []
    for row in rows:
        note = dict(row)
        note['links_to'] = json.loads(note.get('links_to') or '[]')
        note['linked_from'] = json.loads(note.get('linked_from') or '[]')
        note['linked_jobs'] = json.loads(note.get('linked_jobs') or '[]')
        result.append(note)

    return result


def reindex_all_notes(user_id: int) -> int:
    """Rebuild the metadata index for all notes in user's PKM directory.

    Returns the number of notes indexed.
    """
    user_path = get_user_pkm_path(user_id)
    count = 0

    for root, _, files in os.walk(user_path):
        for file_name in files:
            if file_name.endswith('.md') and not file_name.startswith('.'):
                full_path = Path(root) / file_name
                rel_path = str(full_path.relative_to(user_path)).replace("\\", "/")

                content = full_path.read_text(encoding='utf-8')
                upsert_note_metadata(user_id, rel_path, content)
                count += 1

    return count
