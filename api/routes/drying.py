"""
Apex Assistant - Drying Tracker API Routes

Endpoints for structural drying documentation.
All endpoints are scoped to a project (job) via /api/projects/{project_id}/drying.
"""
from typing import Optional, List
from datetime import datetime
from pathlib import Path
from fastapi import APIRouter, HTTPException, Depends, Query
from api.repositories.drying_repository import get_drying_repository, DryingRepository
from api.services.drying_report_service import get_drying_report_service
from api.utils.gpp import calculate_gpp, calculate_gpp_with_assessment, get_condition_level
from database.operations_apex import create_media, get_media_for_project
from api.schemas.operations import MediaResponse
from api.schemas.drying import (
    # GPP
    GppCalculationRequest,
    GppCalculationResponse,
    # Drying Log
    DryingLogCreate,
    DryingLogUpdate,
    DryingLogResponse,
    DryingLogFullResponse,
    # Chambers
    ChamberCreate,
    ChamberUpdate,
    ChamberResponse,
    ChamberListResponse,
    # Rooms
    RoomCreate,
    RoomUpdate,
    RoomResponse,
    RoomListResponse,
    # Reference Points
    ReferencePointCreate,
    ReferencePointUpdate,
    ReferencePointResponse,
    ReferencePointListResponse,
    # Moisture Readings
    MoistureReadingBulkCreate,
    MoistureReadingResponse,
    # Equipment
    EquipmentCreate,
    EquipmentResponse,
    # Equipment Counts
    EquipmentCountBulkCreate,
    EquipmentCountResponse,
    PreviousEquipmentCountResponse,
    # Daily Logs
    DailyLogCreate,
    DailyLogUpdate,
    DailyLogResponse,
    DailyLogListResponse,
    # Atmospheric
    AtmosphericReadingBulkCreate,
    AtmosphericReadingResponse,
    # Setup
    DryingSetupCreate,
    DryingSetupResponse,
    # Daily Entry
    DailyEntryCreate,
    DailyEntryResponse,
    # Material Baselines
    MaterialBaselineUpdate,
    MaterialBaselineResponse,
    MaterialBaselinesResponse,
)
import logging

logger = logging.getLogger("apex_assistant.drying_routes")

router = APIRouter()


def get_repo() -> DryingRepository:
    """Dependency to get drying repository."""
    return get_drying_repository()


# =============================================================================
# GPP CALCULATION (Standalone utility endpoint)
# =============================================================================

@router.post("/drying/calculate-gpp", response_model=GppCalculationResponse)
async def calculate_gpp_endpoint(request: GppCalculationRequest):
    """
    Calculate GPP (Grains Per Pound) from temperature and relative humidity.

    GPP is a key metric for water damage restoration indicating moisture content in air.

    Reference levels:
    - < 40: Good drying conditions
    - 40-60: Moderate (comfortable)
    - 60-100: High (active drying needed)
    - 100-135: Very High (aggressive drying required)
    - > 135: Near Saturation (check for ongoing water intrusion)
    """
    result = calculate_gpp_with_assessment(
        request.temp_f,
        request.rh_percent,
        request.pressure_psia
    )
    return GppCalculationResponse(
        gpp=result.gpp,
        condition=result.condition,
        condition_level=get_condition_level(result.gpp)
    )


# =============================================================================
# MATERIAL BASELINE ENDPOINTS (Custom baselines per material type)
# =============================================================================

@router.get("/drying/material-baselines", response_model=MaterialBaselinesResponse)
async def get_material_baselines(repo: DryingRepository = Depends(get_repo)):
    """
    Get all custom material baselines.

    Returns a dictionary mapping material codes to their custom baseline values.
    Use these to override DEFAULT_BASELINES in the frontend.
    """
    baselines = await repo.get_material_baselines()
    return MaterialBaselinesResponse(baselines=baselines)


@router.post("/drying/material-baselines", response_model=MaterialBaselineResponse)
async def save_material_baseline(
    data: MaterialBaselineUpdate,
    repo: DryingRepository = Depends(get_repo)
):
    """
    Save a custom baseline for a material type.

    Once saved, this baseline will be the default for any new reference points
    of this material type.
    """
    result = await repo.upsert_material_baseline(data.material_code, data.baseline)
    return MaterialBaselineResponse(
        material_code=result["material_code"],
        baseline=float(result["baseline"]),
        updated_at=result.get("updated_at")
    )


# =============================================================================
# DRYING LOG ENDPOINTS
# =============================================================================

@router.get(
    "/projects/{project_id}/drying",
    response_model=Optional[DryingLogFullResponse]
)
async def get_drying_log(
    project_id: int,
    repo: DryingRepository = Depends(get_repo)
):
    """
    Get drying log for a project with all nested data.

    Returns complete drying log including chambers, rooms, reference points,
    equipment, daily logs, and atmospheric readings.
    """
    return await repo.get_drying_log_full(project_id)


@router.post(
    "/projects/{project_id}/drying",
    response_model=DryingLogResponse,
    status_code=201
)
async def create_drying_log(
    project_id: int,
    data: DryingLogCreate,
    repo: DryingRepository = Depends(get_repo)
):
    """Create a new drying log for a project."""
    # Check if log already exists
    existing = await repo.get_drying_log_by_job(project_id)
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Drying log already exists for this project"
        )

    return await repo.create_drying_log({
        "job_id": project_id,
        "start_date": data.start_date,
        "end_date": data.end_date,
    })


@router.patch(
    "/projects/{project_id}/drying",
    response_model=DryingLogResponse
)
async def update_drying_log(
    project_id: int,
    data: DryingLogUpdate,
    repo: DryingRepository = Depends(get_repo)
):
    """Update drying log settings."""
    log = await repo.get_drying_log_by_job(project_id)
    if not log:
        raise HTTPException(status_code=404, detail="Drying log not found")

    update_data = data.model_dump(exclude_unset=True)
    if not update_data:
        return log

    return await repo.update_drying_log(log.id, update_data)


@router.delete("/projects/{project_id}/drying")
async def delete_drying_log(
    project_id: int,
    repo: DryingRepository = Depends(get_repo)
):
    """Delete drying log and all related data."""
    log = await repo.get_drying_log_by_job(project_id)
    if not log:
        raise HTTPException(status_code=404, detail="Drying log not found")

    deleted = await repo.delete_drying_log(log.id)
    if not deleted:
        raise HTTPException(status_code=500, detail="Failed to delete drying log")

    return {"message": "Drying log deleted"}


# =============================================================================
# SETUP WIZARD ENDPOINT
# =============================================================================

@router.post(
    "/projects/{project_id}/drying/setup",
    response_model=DryingSetupResponse,
    status_code=201
)
async def setup_drying_log(
    project_id: int,
    data: DryingSetupCreate,
    repo: DryingRepository = Depends(get_repo)
):
    """
    Create complete drying log setup from wizard.

    Creates drying log, rooms, chambers, reference points, and equipment
    in one transaction.
    """
    # Check if log already exists
    existing = await repo.get_drying_log_by_job(project_id)
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Drying log already exists for this project"
        )

    # Convert Pydantic models to dicts
    rooms_data = [
        {
            "name": r.name,
            "reference_points": [rp.model_dump() for rp in r.reference_points],
            # Support both new format (equipment with counts) and legacy (equipment_types)
            "equipment": [eq.model_dump() for eq in r.equipment] if r.equipment else [],
            "equipment_types": r.equipment_types  # Legacy support
        }
        for r in data.rooms
    ]

    chambers_data = [
        {
            "name": c.name,
            "chamber_type": c.chamber_type,
            "room_ids": c.room_ids
        }
        for c in data.chambers
    ]

    result = await repo.setup_drying_log(
        job_id=project_id,
        start_date=data.start_date,
        rooms_data=rooms_data,
        chambers_data=chambers_data
    )

    return DryingSetupResponse(**result)


# =============================================================================
# CHAMBER ENDPOINTS
# =============================================================================

@router.get(
    "/projects/{project_id}/drying/chambers",
    response_model=ChamberListResponse
)
async def list_chambers(
    project_id: int,
    repo: DryingRepository = Depends(get_repo)
):
    """Get all chambers for a drying log."""
    log = await repo.get_drying_log_by_job(project_id)
    if not log:
        raise HTTPException(status_code=404, detail="Drying log not found")

    chambers = await repo.get_chambers(log.id)
    return ChamberListResponse(chambers=chambers, total=len(chambers))


@router.post(
    "/projects/{project_id}/drying/chambers",
    response_model=ChamberResponse,
    status_code=201
)
async def create_chamber(
    project_id: int,
    data: ChamberCreate,
    repo: DryingRepository = Depends(get_repo)
):
    """Create a new chamber."""
    log = await repo.get_drying_log_by_job(project_id)
    if not log:
        raise HTTPException(status_code=404, detail="Drying log not found")

    return await repo.create_chamber(log.id, data.model_dump())


@router.patch(
    "/projects/{project_id}/drying/chambers/{chamber_id}",
    response_model=ChamberResponse
)
async def update_chamber(
    project_id: int,
    chamber_id: str,
    data: ChamberUpdate,
    repo: DryingRepository = Depends(get_repo)
):
    """Update a chamber."""
    update_data = data.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    return await repo.update_chamber(chamber_id, update_data)


@router.delete("/projects/{project_id}/drying/chambers/{chamber_id}")
async def delete_chamber(
    project_id: int,
    chamber_id: str,
    repo: DryingRepository = Depends(get_repo)
):
    """Delete a chamber."""
    deleted = await repo.delete_chamber(chamber_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Chamber not found")
    return {"message": "Chamber deleted"}


# =============================================================================
# ROOM ENDPOINTS
# =============================================================================

@router.get(
    "/projects/{project_id}/drying/rooms",
    response_model=RoomListResponse
)
async def list_rooms(
    project_id: int,
    repo: DryingRepository = Depends(get_repo)
):
    """Get all rooms for a drying log."""
    log = await repo.get_drying_log_by_job(project_id)
    if not log:
        raise HTTPException(status_code=404, detail="Drying log not found")

    rooms = await repo.get_rooms(log.id)
    return RoomListResponse(rooms=rooms, total=len(rooms))


@router.post(
    "/projects/{project_id}/drying/rooms",
    response_model=RoomResponse,
    status_code=201
)
async def create_room(
    project_id: int,
    data: RoomCreate,
    repo: DryingRepository = Depends(get_repo)
):
    """Create a new room."""
    log = await repo.get_drying_log_by_job(project_id)
    if not log:
        raise HTTPException(status_code=404, detail="Drying log not found")

    return await repo.create_room(log.id, data.model_dump())


@router.patch(
    "/projects/{project_id}/drying/rooms/{room_id}",
    response_model=RoomResponse
)
async def update_room(
    project_id: int,
    room_id: str,
    data: RoomUpdate,
    repo: DryingRepository = Depends(get_repo)
):
    """Update a room."""
    update_data = data.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    return await repo.update_room(room_id, update_data)


@router.delete("/projects/{project_id}/drying/rooms/{room_id}")
async def delete_room(
    project_id: int,
    room_id: str,
    repo: DryingRepository = Depends(get_repo)
):
    """Delete a room and all its reference points and equipment."""
    deleted = await repo.delete_room(room_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Room not found")
    return {"message": "Room deleted"}


# =============================================================================
# REFERENCE POINT ENDPOINTS
# =============================================================================

@router.get(
    "/projects/{project_id}/drying/rooms/{room_id}/reference-points",
    response_model=ReferencePointListResponse
)
async def list_reference_points(
    project_id: int,
    room_id: str,
    repo: DryingRepository = Depends(get_repo)
):
    """Get all reference points for a room."""
    points = await repo.get_reference_points(room_id)
    return ReferencePointListResponse(reference_points=points, total=len(points))


@router.post(
    "/projects/{project_id}/drying/rooms/{room_id}/reference-points",
    response_model=ReferencePointResponse,
    status_code=201
)
async def create_reference_point(
    project_id: int,
    room_id: str,
    data: ReferencePointCreate,
    repo: DryingRepository = Depends(get_repo)
):
    """Create a new reference point."""
    return await repo.create_reference_point(room_id, data.model_dump())


@router.patch(
    "/projects/{project_id}/drying/rooms/{room_id}/reference-points/{point_id}",
    response_model=ReferencePointResponse
)
async def update_reference_point(
    project_id: int,
    room_id: str,
    point_id: str,
    data: ReferencePointUpdate,
    repo: DryingRepository = Depends(get_repo)
):
    """Update a reference point."""
    update_data = data.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    return await repo.update_reference_point(point_id, update_data)


@router.delete(
    "/projects/{project_id}/drying/rooms/{room_id}/reference-points/{point_id}"
)
async def delete_reference_point(
    project_id: int,
    room_id: str,
    point_id: str,
    repo: DryingRepository = Depends(get_repo)
):
    """Delete a reference point."""
    deleted = await repo.delete_reference_point(point_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Reference point not found")
    return {"message": "Reference point deleted"}


# =============================================================================
# MOISTURE READING ENDPOINTS
# =============================================================================

@router.post("/projects/{project_id}/drying/readings")
async def save_moisture_readings(
    project_id: int,
    data: MoistureReadingBulkCreate,
    repo: DryingRepository = Depends(get_repo)
):
    """Bulk save moisture readings for a date."""
    readings_data = [
        {
            "reference_point_id": r.reference_point_id,
            "reading_date": data.reading_date,
            "reading_value": r.reading_value
        }
        for r in data.readings
    ]

    results = await repo.upsert_moisture_readings(readings_data)
    return {"saved": len(results)}


@router.get("/projects/{project_id}/drying/readings")
async def get_readings_for_date(
    project_id: int,
    date: str = Query(..., description="Date in YYYY-MM-DD format"),
    repo: DryingRepository = Depends(get_repo)
):
    """
    Get all moisture readings for a specific date.
    Returns: {reference_point_id: reading_value, ...}
    """
    # Get the drying log for this project
    drying_log = await repo.get_drying_log_by_job(project_id)
    if not drying_log:
        raise HTTPException(status_code=404, detail="Drying log not found")

    readings = await repo.get_all_readings_for_date(drying_log.id, date)
    return {"readings": readings, "date": date}


# =============================================================================
# EQUIPMENT ENDPOINTS
# =============================================================================

@router.get("/projects/{project_id}/drying/rooms/{room_id}/equipment")
async def list_equipment(
    project_id: int,
    room_id: str,
    repo: DryingRepository = Depends(get_repo)
):
    """Get all equipment types for a room."""
    equipment = await repo.get_equipment(room_id)
    return {"equipment": equipment, "total": len(equipment)}


@router.post(
    "/projects/{project_id}/drying/rooms/{room_id}/equipment",
    response_model=EquipmentResponse,
    status_code=201
)
async def create_equipment(
    project_id: int,
    room_id: str,
    data: EquipmentCreate,
    repo: DryingRepository = Depends(get_repo)
):
    """Add equipment type to a room."""
    return await repo.create_equipment(room_id, data.model_dump())


@router.delete(
    "/projects/{project_id}/drying/rooms/{room_id}/equipment/{equipment_id}"
)
async def delete_equipment(
    project_id: int,
    room_id: str,
    equipment_id: str,
    repo: DryingRepository = Depends(get_repo)
):
    """Remove equipment type from a room."""
    deleted = await repo.delete_equipment(equipment_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Equipment not found")
    return {"message": "Equipment deleted"}


# =============================================================================
# EQUIPMENT COUNT ENDPOINTS
# =============================================================================

@router.post("/projects/{project_id}/drying/equipment-counts")
async def save_equipment_counts(
    project_id: int,
    data: EquipmentCountBulkCreate,
    repo: DryingRepository = Depends(get_repo)
):
    """Bulk save equipment counts for a date."""
    counts_data = [
        {
            "equipment_id": c.equipment_id,
            "count_date": data.count_date,
            "count": c.count
        }
        for c in data.counts
    ]

    results = await repo.upsert_equipment_counts(counts_data)
    return {"saved": len(results)}


@router.get(
    "/projects/{project_id}/drying/previous-equipment-counts",
    response_model=List[PreviousEquipmentCountResponse]
)
async def get_previous_equipment_counts(
    project_id: int,
    date: str = Query(..., description="Date for which to get previous counts (YYYY-MM-DD)"),
    repo: DryingRepository = Depends(get_repo)
):
    """
    Get equipment counts from the most recent day before the specified date.

    Used to pre-populate equipment counts for new visits (day 2+).
    Returns empty list if no previous counts exist.
    """
    log = await repo.get_drying_log_by_job(project_id)
    if not log:
        raise HTTPException(status_code=404, detail="Drying log not found")

    return await repo.get_previous_equipment_counts(log.id, date)


# =============================================================================
# DAILY LOG ENDPOINTS
# =============================================================================

@router.get(
    "/projects/{project_id}/drying/daily-logs",
    response_model=DailyLogListResponse
)
async def list_daily_logs(
    project_id: int,
    repo: DryingRepository = Depends(get_repo)
):
    """Get all daily logs for a drying log."""
    log = await repo.get_drying_log_by_job(project_id)
    if not log:
        raise HTTPException(status_code=404, detail="Drying log not found")

    daily_logs = await repo.get_daily_logs(log.id)
    return DailyLogListResponse(daily_logs=daily_logs, total=len(daily_logs))


@router.get(
    "/projects/{project_id}/drying/daily-logs/{log_date}",
    response_model=Optional[DailyLogResponse]
)
async def get_daily_log(
    project_id: int,
    log_date: str,
    repo: DryingRepository = Depends(get_repo)
):
    """Get daily log for a specific date."""
    log = await repo.get_drying_log_by_job(project_id)
    if not log:
        raise HTTPException(status_code=404, detail="Drying log not found")

    return await repo.get_daily_log_by_date(log.id, log_date)


@router.put(
    "/projects/{project_id}/drying/daily-logs/{log_date}",
    response_model=DailyLogResponse
)
async def upsert_daily_log(
    project_id: int,
    log_date: str,
    data: DailyLogUpdate,
    repo: DryingRepository = Depends(get_repo)
):
    """Create or update daily log for a date."""
    log = await repo.get_drying_log_by_job(project_id)
    if not log:
        raise HTTPException(status_code=404, detail="Drying log not found")

    return await repo.upsert_daily_log(log.id, log_date, data.notes)


# =============================================================================
# ATMOSPHERIC READING ENDPOINTS
# =============================================================================

@router.post("/projects/{project_id}/drying/atmospheric")
async def save_atmospheric_readings(
    project_id: int,
    data: AtmosphericReadingBulkCreate,
    repo: DryingRepository = Depends(get_repo)
):
    """
    Bulk save atmospheric readings for a daily log.

    Uses location_type enum with optional chamber_id and equipment_id:
    - outside: No chamber_id or equipment_id
    - unaffected: No chamber_id or equipment_id
    - chamber_interior: Requires chamber_id
    - dehumidifier_exhaust: Requires chamber_id and equipment_id
    """
    readings_data = [
        {
            "location_type": r.location_type,
            "chamber_id": r.chamber_id,
            "equipment_id": r.equipment_id,
            "temp_f": r.temp_f,
            "rh_percent": r.rh_percent,
            "gpp": r.gpp,
            # Include legacy location field for backwards compatibility
            "location": r.location
        }
        for r in data.readings
    ]

    results = await repo.upsert_atmospheric_readings(data.daily_log_id, readings_data)
    return {"saved": len(results)}


# =============================================================================
# COMBINED DAILY ENTRY ENDPOINT
# =============================================================================

@router.post(
    "/projects/{project_id}/drying/daily-entry",
    response_model=DailyEntryResponse
)
async def save_daily_entry(
    project_id: int,
    data: DailyEntryCreate,
    repo: DryingRepository = Depends(get_repo)
):
    """
    Save all daily data in one call.

    Creates/updates daily log, atmospheric readings, moisture readings,
    and equipment counts for the specified date.
    """
    log = await repo.get_drying_log_by_job(project_id)
    if not log:
        raise HTTPException(status_code=404, detail="Drying log not found")

    # 1. Upsert daily log
    daily_log = await repo.upsert_daily_log(log.id, data.log_date, data.notes)

    # 2. Save atmospheric readings
    atmo_saved = 0
    if data.atmospheric_readings:
        readings_data = [
            {
                "location_type": r.location_type,
                "chamber_id": r.chamber_id,
                "equipment_id": r.equipment_id,
                "temp_f": r.temp_f,
                "rh_percent": r.rh_percent,
                "gpp": r.gpp,
                # Include legacy location field for backwards compatibility
                "location": r.location
            }
            for r in data.atmospheric_readings
        ]
        results = await repo.upsert_atmospheric_readings(daily_log.id, readings_data)
        atmo_saved = len(results)

    # 3. Save moisture readings and equipment counts
    moisture_saved = 0
    equipment_saved = 0

    for room_entry in data.room_entries:
        # Moisture readings
        if room_entry.readings:
            readings_data = [
                {
                    "reference_point_id": r.reference_point_id,
                    "reading_date": data.log_date,
                    "reading_value": r.reading_value
                }
                for r in room_entry.readings
            ]
            results = await repo.upsert_moisture_readings(readings_data)
            moisture_saved += len(results)

        # Equipment counts
        if room_entry.equipment_counts:
            counts_data = [
                {
                    "equipment_id": c.equipment_id,
                    "count_date": data.log_date,
                    "count": c.count
                }
                for c in room_entry.equipment_counts
            ]
            results = await repo.upsert_equipment_counts(counts_data)
            equipment_saved += len(results)

    # Fetch updated daily log with atmospheric readings
    updated_daily_log = await repo.get_daily_log_by_date(log.id, data.log_date)
    if updated_daily_log:
        updated_daily_log.atmospheric_readings = await repo.get_atmospheric_readings(
            updated_daily_log.id
        )

    return DailyEntryResponse(
        daily_log=updated_daily_log,
        moisture_readings_saved=moisture_saved,
        equipment_counts_saved=equipment_saved,
        atmospheric_readings_saved=atmo_saved
    )


# =============================================================================
# REPORT GENERATION ENDPOINT
# =============================================================================

@router.post(
    "/projects/{project_id}/drying/report",
    response_model=MediaResponse
)
async def generate_drying_report(
    project_id: int,
    repo: DryingRepository = Depends(get_repo)
):
    """
    Generate a PDF drying report for a project.

    Creates a professional PDF report with:
    - Job and client information
    - Drying summary with progress statistics
    - Moisture readings by room with color-coded status
    - Atmospheric conditions table
    - Equipment log

    The report is saved as a media record and can be accessed via the Documents tab.

    Returns:
        MediaResponse with the created media record details
    """
    logger.info(f"Generating drying report for project {project_id}")

    # 1. Collect all report data
    report_data = await repo.get_report_data(project_id)

    if not report_data:
        raise HTTPException(
            status_code=404,
            detail="No drying log data found for this project"
        )

    # 2. Generate PDF
    report_service = get_drying_report_service()
    pdf_bytes = report_service.generate(report_data)

    # 3. Save to filesystem
    job_number = report_data.get("job_info", {}).get("job_number", str(project_id))
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"drying_report_{job_number}_{timestamp}.pdf"

    # Create reports directory if it doesn't exist
    reports_dir = Path("uploads/reports")
    reports_dir.mkdir(parents=True, exist_ok=True)

    filepath = reports_dir / filename
    filepath.write_bytes(pdf_bytes)

    logger.info(f"Saved drying report to {filepath}")

    # 4. Create media record
    media_id = create_media(
        project_id=project_id,
        file_name=filename,
        file_path=str(filepath),
        file_type="application/pdf",
        file_size=len(pdf_bytes),
        caption="Structural Drying Report",
    )

    # 5. Return the media record
    media_list = get_media_for_project(project_id)
    created_media = next((m for m in media_list if m.get("id") == media_id), None)

    if not created_media:
        # Fallback response if query fails
        created_media = {
            "id": media_id,
            "project_id": project_id,
            "file_name": filename,
            "file_path": str(filepath),
            "file_type": "application/pdf",
            "file_size": len(pdf_bytes),
            "caption": "Structural Drying Report",
        }

    logger.info(f"Created media record {media_id} for drying report")

    return created_media
