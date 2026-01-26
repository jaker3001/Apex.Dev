"""
Apex Assistant - People Routes

REST API endpoints for personal contact management.
These are personal relationships (not business contacts).
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List

from api.routes.auth import require_auth, UserProfile
from api.schemas.second_brain import (
    PersonCreate, PersonUpdate, PersonResponse, PeopleResponse,
)
from api.repositories.people_repository import PeopleRepository

router = APIRouter()


def get_people_repo() -> PeopleRepository:
    """Get people repository instance."""
    return PeopleRepository()


# ============================================
# PEOPLE ENDPOINTS
# ============================================

@router.get("/people", response_model=PeopleResponse)
async def list_people(
    relationship: Optional[str] = Query(None, description="Filter by relationship type"),
    tag_id: Optional[int] = Query(None, description="Filter by tag"),
    is_favorite: Optional[bool] = Query(None, description="Filter favorites"),
    needs_check_in: bool = Query(False, description="Only show people needing check-in"),
    include_archived: bool = Query(False, description="Include archived contacts"),
    search: Optional[str] = Query(None, description="Search by name"),
    user: UserProfile = Depends(require_auth),
    repo: PeopleRepository = Depends(get_people_repo),
):
    """
    Get personal contacts with optional filters.

    Relationships can include: family, friend, colleague, mentor, etc.
    Use `needs_check_in=true` to find contacts with overdue check-ins.
    """
    if needs_check_in:
        people = await repo.find_needing_check_in(user.id)
    elif relationship:
        people = await repo.find_by_relationship(
            user.id, relationship,
            include_archived=include_archived,
        )
    elif tag_id:
        people = await repo.find_by_tag(
            user.id, tag_id,
            include_archived=include_archived,
        )
    else:
        people = await repo.find_by_user(
            user.id,
            include_archived=include_archived,
        )

    # Filter favorites if requested
    if is_favorite is not None:
        people = [p for p in people if p.is_favorite == is_favorite]

    # Search filter
    if search:
        search_lower = search.lower()
        people = [
            p for p in people
            if search_lower in p.name.lower()
            or (p.email and search_lower in p.email.lower())
            or (p.company and search_lower in p.company.lower())
        ]

    return PeopleResponse(people=people, total=len(people))


@router.post("/people", response_model=PersonResponse)
async def create_person(
    data: PersonCreate,
    user: UserProfile = Depends(require_auth),
    repo: PeopleRepository = Depends(get_people_repo),
):
    """Create a new personal contact."""
    person_data = data.model_dump()
    person_data["user_id"] = user.id

    person = await repo.create(person_data)
    return person


@router.get("/people/{person_id}", response_model=PersonResponse)
async def get_person(
    person_id: int,
    user: UserProfile = Depends(require_auth),
    repo: PeopleRepository = Depends(get_people_repo),
):
    """Get a specific personal contact with their tags."""
    person = await repo.find_by_id(person_id)
    if not person or person.user_id != user.id:
        raise HTTPException(status_code=404, detail="Person not found")

    return person


@router.patch("/people/{person_id}", response_model=PersonResponse)
async def update_person(
    person_id: int,
    data: PersonUpdate,
    user: UserProfile = Depends(require_auth),
    repo: PeopleRepository = Depends(get_people_repo),
):
    """Update a personal contact."""
    existing = await repo.find_by_id(person_id)
    if not existing or existing.user_id != user.id:
        raise HTTPException(status_code=404, detail="Person not found")

    update_data = data.model_dump(exclude_unset=True)
    if not update_data:
        return existing

    person = await repo.update(person_id, update_data)
    return person


@router.delete("/people/{person_id}")
async def delete_person(
    person_id: int,
    user: UserProfile = Depends(require_auth),
    repo: PeopleRepository = Depends(get_people_repo),
):
    """Delete a personal contact."""
    existing = await repo.find_by_id(person_id)
    if not existing or existing.user_id != user.id:
        raise HTTPException(status_code=404, detail="Person not found")

    success = await repo.delete(person_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete person")

    return {"status": "ok", "deleted": True}


# ============================================
# RELATIONSHIP MANAGEMENT
# ============================================

@router.post("/people/{person_id}/favorite", response_model=PersonResponse)
async def toggle_favorite(
    person_id: int,
    user: UserProfile = Depends(require_auth),
    repo: PeopleRepository = Depends(get_people_repo),
):
    """Toggle favorite status for a contact."""
    existing = await repo.find_by_id(person_id)
    if not existing or existing.user_id != user.id:
        raise HTTPException(status_code=404, detail="Person not found")

    person = await repo.update(person_id, {"is_favorite": not existing.is_favorite})
    return person


@router.post("/people/{person_id}/archive", response_model=PersonResponse)
async def archive_person(
    person_id: int,
    user: UserProfile = Depends(require_auth),
    repo: PeopleRepository = Depends(get_people_repo),
):
    """Archive a contact."""
    existing = await repo.find_by_id(person_id)
    if not existing or existing.user_id != user.id:
        raise HTTPException(status_code=404, detail="Person not found")

    person = await repo.update(person_id, {"archived": True})
    return person


@router.post("/people/{person_id}/unarchive", response_model=PersonResponse)
async def unarchive_person(
    person_id: int,
    user: UserProfile = Depends(require_auth),
    repo: PeopleRepository = Depends(get_people_repo),
):
    """Unarchive a contact."""
    existing = await repo.find_by_id(person_id)
    if not existing or existing.user_id != user.id:
        raise HTTPException(status_code=404, detail="Person not found")

    person = await repo.update(person_id, {"archived": False})
    return person


# ============================================
# CHECK-IN MANAGEMENT
# ============================================

@router.post("/people/{person_id}/check-in", response_model=PersonResponse)
async def record_check_in(
    person_id: int,
    next_check_in_days: Optional[int] = Query(None, description="Days until next check-in"),
    user: UserProfile = Depends(require_auth),
    repo: PeopleRepository = Depends(get_people_repo),
):
    """
    Record a check-in with a contact.

    Updates last_check_in to today and optionally sets next_check_in.
    """
    existing = await repo.find_by_id(person_id)
    if not existing or existing.user_id != user.id:
        raise HTTPException(status_code=404, detail="Person not found")

    person = await repo.record_check_in(person_id, next_check_in_days)
    return person


@router.patch("/people/{person_id}/next-check-in", response_model=PersonResponse)
async def set_next_check_in(
    person_id: int,
    date: str = Query(..., description="Next check-in date (YYYY-MM-DD)"),
    user: UserProfile = Depends(require_auth),
    repo: PeopleRepository = Depends(get_people_repo),
):
    """Set the next check-in date for a contact."""
    existing = await repo.find_by_id(person_id)
    if not existing or existing.user_id != user.id:
        raise HTTPException(status_code=404, detail="Person not found")

    person = await repo.update(person_id, {"next_check_in": date})
    return person


# ============================================
# TAG MANAGEMENT
# ============================================

@router.post("/people/{person_id}/tags/{tag_id}", response_model=PersonResponse)
async def add_tag_to_person(
    person_id: int,
    tag_id: int,
    user: UserProfile = Depends(require_auth),
    repo: PeopleRepository = Depends(get_people_repo),
):
    """Add a tag to a contact."""
    existing = await repo.find_by_id(person_id)
    if not existing or existing.user_id != user.id:
        raise HTTPException(status_code=404, detail="Person not found")

    success = await repo.add_tag(person_id, tag_id)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to add tag")

    person = await repo.find_by_id(person_id)
    return person


@router.delete("/people/{person_id}/tags/{tag_id}", response_model=PersonResponse)
async def remove_tag_from_person(
    person_id: int,
    tag_id: int,
    user: UserProfile = Depends(require_auth),
    repo: PeopleRepository = Depends(get_people_repo),
):
    """Remove a tag from a contact."""
    existing = await repo.find_by_id(person_id)
    if not existing or existing.user_id != user.id:
        raise HTTPException(status_code=404, detail="Person not found")

    success = await repo.remove_tag(person_id, tag_id)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to remove tag")

    person = await repo.find_by_id(person_id)
    return person


# ============================================
# UPCOMING BIRTHDAYS
# ============================================

@router.get("/people/birthdays/upcoming")
async def get_upcoming_birthdays(
    days: int = Query(30, description="Days to look ahead"),
    user: UserProfile = Depends(require_auth),
    repo: PeopleRepository = Depends(get_people_repo),
):
    """
    Get contacts with upcoming birthdays.

    Returns contacts whose birthdays fall within the next N days.
    """
    from datetime import date, timedelta

    today = date.today()
    end_date = today + timedelta(days=days)

    # Get all people with birthdays
    people = await repo.find_by_user(user.id)
    upcoming = []

    for person in people:
        if not person.birthday:
            continue

        try:
            # Parse birthday (stored as YYYY-MM-DD)
            bday_parts = person.birthday.split("-")
            bday_month = int(bday_parts[1])
            bday_day = int(bday_parts[2])

            # Check this year and next year
            for year in [today.year, today.year + 1]:
                try:
                    next_bday = date(year, bday_month, bday_day)
                    if today <= next_bday <= end_date:
                        upcoming.append({
                            "person": person,
                            "birthday_date": next_bday.isoformat(),
                            "days_away": (next_bday - today).days,
                        })
                        break
                except ValueError:
                    # Invalid date (e.g., Feb 29 in non-leap year)
                    continue
        except (ValueError, IndexError):
            continue

    # Sort by days away
    upcoming.sort(key=lambda x: x["days_away"])

    return {
        "upcoming_birthdays": upcoming,
        "total": len(upcoming),
    }
