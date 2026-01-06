"""
Apex Assistant - Drying Tracker Schemas

Pydantic models for structural drying documentation including:
- Drying Logs (main entry per job)
- Chambers (containment zones)
- Rooms (affected areas)
- Reference Points (moisture reading locations)
- Moisture Readings (daily values)
- Equipment (types and counts)
- Daily Logs (notes and atmospheric readings)
"""

from typing import Optional, List, Literal
from pydantic import BaseModel, Field
from datetime import date, datetime
from decimal import Decimal


# =============================================================================
# TYPE DEFINITIONS
# =============================================================================

DryingLogStatus = Literal["active", "complete", "on_hold"]
ChamberType = Literal["Containment", "Open", "Cavity"]
ConditionLevel = Literal["good", "moderate", "high", "very_high", "critical"]

# Atmospheric reading location types
AtmosphericLocationType = Literal[
    "outside",              # Weather/exterior conditions
    "unaffected",           # Inside property, not in drying zone
    "chamber_interior",     # Inside a drying chamber (affected area)
    "dehumidifier_exhaust"  # Exhaust from specific dehumidifier
]

# Standard materials with their codes
# Material composition matters more than building component
MaterialCode = Literal[
    "D",      # Drywall/Sheetrock
    "C",      # Carpet
    "CP",     # Carpet Pad
    "HW",     # Hardwood
    "LAM",    # Laminate
    "ENG",    # Engineered Hardwood
    "FRM",    # Framing
    "INS",    # Insulation
    "CAB",    # Cabinet
    "MDF",    # MDF (Medium-Density Fiberboard)
    "OSB",    # OSB (Oriented Strand Board)
    "PLY",    # Plywood
    "CONC",   # Concrete
    "TL",     # Tile
    "OTHER"   # Other
]


# =============================================================================
# GPP CALCULATION SCHEMAS
# =============================================================================

class GppCalculationRequest(BaseModel):
    """Request schema for GPP calculation."""
    temp_f: float = Field(..., ge=32, le=120, description="Temperature in Fahrenheit")
    rh_percent: float = Field(..., ge=0, le=100, description="Relative humidity percentage")
    pressure_psia: float = Field(default=14.696, description="Atmospheric pressure in psia")


class GppCalculationResponse(BaseModel):
    """Response schema for GPP calculation."""
    gpp: float
    condition: str
    condition_level: ConditionLevel


# =============================================================================
# DRYING LOG SCHEMAS (Main entry - one per job)
# =============================================================================

class DryingLogCreate(BaseModel):
    """Schema for creating a new drying log."""
    job_id: int
    start_date: str  # YYYY-MM-DD
    end_date: Optional[str] = None


class DryingLogUpdate(BaseModel):
    """Schema for updating a drying log (all fields optional)."""
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    status: Optional[DryingLogStatus] = None


class DryingLogResponse(BaseModel):
    """Response schema for a drying log."""
    id: str  # UUID
    job_id: int
    start_date: str
    end_date: Optional[str] = None
    status: str = "active"
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    created_by: Optional[str] = None  # UUID


# =============================================================================
# CHAMBER SCHEMAS (Containment zones)
# =============================================================================

class ChamberCreate(BaseModel):
    """Schema for creating a new drying chamber."""
    name: str = Field(..., min_length=1, max_length=100)
    chamber_type: ChamberType
    sort_order: int = 0


class ChamberUpdate(BaseModel):
    """Schema for updating a chamber (all fields optional)."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    chamber_type: Optional[ChamberType] = None
    sort_order: Optional[int] = None


class ChamberResponse(BaseModel):
    """Response schema for a drying chamber."""
    id: str  # UUID
    drying_log_id: str
    name: str
    chamber_type: str
    sort_order: int = 0
    created_at: Optional[str] = None
    # Nested rooms when requested
    rooms: List["RoomResponse"] = []


# =============================================================================
# ROOM SCHEMAS (Affected areas)
# =============================================================================

class RoomCreate(BaseModel):
    """Schema for creating a new drying room."""
    name: str = Field(..., min_length=1, max_length=100)
    chamber_id: Optional[str] = None  # UUID, can be unassigned initially
    sort_order: int = 0


class RoomUpdate(BaseModel):
    """Schema for updating a room (all fields optional)."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    chamber_id: Optional[str] = None
    sort_order: Optional[int] = None


class RoomResponse(BaseModel):
    """Response schema for a drying room."""
    id: str  # UUID
    drying_log_id: str
    chamber_id: Optional[str] = None
    name: str
    sort_order: int = 0
    created_at: Optional[str] = None
    # Nested data when requested
    reference_points: List["ReferencePointResponse"] = []
    equipment: List["EquipmentResponse"] = []


# =============================================================================
# REFERENCE POINT SCHEMAS (Moisture reading locations)
# =============================================================================

class ReferencePointCreate(BaseModel):
    """Schema for creating a new reference point."""
    material: str = Field(..., description="e.g., 'Drywall/Sheetrock', 'Carpet', 'Flooring'")
    material_code: str = Field(..., description="e.g., 'D', 'C', 'F', 'SF', 'FRM'")
    baseline: float = Field(default=10.0, ge=0, le=100, description="Dry standard for this material")
    saturation: Optional[float] = Field(None, ge=0, le=100, description="Initial wet reading")
    sort_order: int = 0


class ReferencePointUpdate(BaseModel):
    """Schema for updating a reference point (all fields optional)."""
    material: Optional[str] = None
    material_code: Optional[str] = None
    baseline: Optional[float] = Field(None, ge=0, le=100)
    saturation: Optional[float] = Field(None, ge=0, le=100)
    sort_order: Optional[int] = None


class ReferencePointResponse(BaseModel):
    """Response schema for a reference point."""
    id: str  # UUID
    room_id: str
    material: str
    material_code: str
    baseline: float = 10.0
    saturation: Optional[float] = None
    sort_order: int = 0
    created_at: Optional[str] = None
    # Latest reading when requested
    latest_reading: Optional[float] = None


# =============================================================================
# MOISTURE READING SCHEMAS (Daily readings)
# =============================================================================

class MoistureReadingCreate(BaseModel):
    """Schema for creating/updating a moisture reading."""
    reference_point_id: str  # UUID
    reading_date: str  # YYYY-MM-DD
    reading_value: Optional[float] = Field(None, ge=0, le=100)


class MoistureReadingBulkCreate(BaseModel):
    """Schema for bulk saving moisture readings for a date."""
    reading_date: str  # YYYY-MM-DD
    readings: List[MoistureReadingCreate]


class MoistureReadingResponse(BaseModel):
    """Response schema for a moisture reading."""
    id: str  # UUID
    reference_point_id: str
    reading_date: str
    reading_value: Optional[float] = None


# =============================================================================
# EQUIPMENT SCHEMAS (Equipment types per room)
# =============================================================================

EquipmentType = Literal[
    "LGR Dehumidifier",
    "XL Dehumidifier",
    "Air Mover",
    "Air Scrubber",
    "Heater"
]


class EquipmentCreate(BaseModel):
    """Schema for creating equipment entry."""
    equipment_type: str = Field(..., description="LGR Dehumidifier, XL Dehumidifier, Air Mover, etc.")


class EquipmentResponse(BaseModel):
    """Response schema for equipment."""
    id: str  # UUID
    room_id: str
    equipment_type: str
    created_at: Optional[str] = None
    # Latest count when requested
    latest_count: Optional[int] = None


# =============================================================================
# EQUIPMENT COUNT SCHEMAS (Daily counts)
# =============================================================================

class EquipmentCountCreate(BaseModel):
    """Schema for creating/updating equipment count."""
    equipment_id: str  # UUID
    count_date: str  # YYYY-MM-DD
    count: int = Field(..., ge=0)


class EquipmentCountBulkCreate(BaseModel):
    """Schema for bulk saving equipment counts for a date."""
    count_date: str  # YYYY-MM-DD
    counts: List[EquipmentCountCreate]


class EquipmentCountResponse(BaseModel):
    """Response schema for equipment count."""
    id: str  # UUID
    equipment_id: str
    count_date: str
    count: int


class PreviousEquipmentCountResponse(BaseModel):
    """Response schema for previous day equipment count (with equipment details)."""
    equipment_id: str
    equipment_type: str
    room_id: str
    room_name: str
    count: int
    count_date: str


# =============================================================================
# DAILY LOG SCHEMAS (Notes per day)
# =============================================================================

class DailyLogCreate(BaseModel):
    """Schema for creating a daily log."""
    log_date: str  # YYYY-MM-DD
    notes: Optional[str] = None


class DailyLogUpdate(BaseModel):
    """Schema for updating a daily log."""
    notes: Optional[str] = None


class DailyLogResponse(BaseModel):
    """Response schema for a daily log."""
    id: str  # UUID
    drying_log_id: str
    log_date: str
    notes: Optional[str] = None
    created_at: Optional[str] = None
    # Nested atmospheric readings
    atmospheric_readings: List["AtmosphericReadingResponse"] = []


# =============================================================================
# ATMOSPHERIC READING SCHEMAS (Temp/RH/GPP per location)
# =============================================================================

class AtmosphericReadingCreate(BaseModel):
    """Schema for creating an atmospheric reading."""
    location_type: AtmosphericLocationType = Field(
        ...,
        description="Type of reading location"
    )
    chamber_id: Optional[str] = Field(
        None,
        description="Required for chamber_interior and dehumidifier_exhaust"
    )
    equipment_id: Optional[str] = Field(
        None,
        description="Required for dehumidifier_exhaust only"
    )
    temp_f: Optional[float] = Field(None, ge=32, le=120)
    rh_percent: Optional[float] = Field(None, ge=0, le=100)
    gpp: Optional[float] = Field(None, ge=0, description="Calculated from temp and RH")

    # Legacy field for backwards compatibility (optional)
    location: Optional[str] = Field(None, description="DEPRECATED: Use location_type instead")


class AtmosphericReadingBulkCreate(BaseModel):
    """Schema for bulk saving atmospheric readings for a daily log."""
    daily_log_id: str  # UUID
    readings: List[AtmosphericReadingCreate]


class AtmosphericReadingResponse(BaseModel):
    """Response schema for an atmospheric reading."""
    id: str  # UUID
    daily_log_id: str
    location_type: AtmosphericLocationType
    chamber_id: Optional[str] = None
    chamber_name: Optional[str] = None  # Joined from chambers table
    equipment_id: Optional[str] = None
    equipment_type: Optional[str] = None  # Joined from equipment table
    equipment_index: Optional[int] = None  # For "LGR #1", "LGR #2" numbering
    temp_f: Optional[float] = None
    rh_percent: Optional[float] = None
    gpp: Optional[float] = None
    condition_level: Optional[ConditionLevel] = None  # Computed from GPP

    # Legacy field for backwards compatibility
    location: Optional[str] = None  # DEPRECATED: Use location_type


# =============================================================================
# FULL DRYING LOG RESPONSE (Complete nested structure)
# =============================================================================

class DryingLogFullResponse(BaseModel):
    """
    Complete drying log response with all nested data.
    Used for the main drying tracker view.
    """
    # Drying log fields
    id: str  # UUID
    job_id: int
    start_date: str
    end_date: Optional[str] = None
    status: str = "active"
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    # Nested data
    chambers: List[ChamberResponse] = []
    rooms: List[RoomResponse] = []
    daily_logs: List[DailyLogResponse] = []

    # Summary data
    total_rooms: int = 0
    total_reference_points: int = 0
    days_active: int = 0
    latest_visit_date: Optional[str] = None


# =============================================================================
# LIST RESPONSE SCHEMAS
# =============================================================================

class DryingLogListResponse(BaseModel):
    """Response schema for listing drying logs."""
    drying_logs: List[DryingLogResponse]
    total: int


class ChamberListResponse(BaseModel):
    """Response schema for listing chambers."""
    chambers: List[ChamberResponse]
    total: int


class RoomListResponse(BaseModel):
    """Response schema for listing rooms."""
    rooms: List[RoomResponse]
    total: int


class ReferencePointListResponse(BaseModel):
    """Response schema for listing reference points."""
    reference_points: List[ReferencePointResponse]
    total: int


class DailyLogListResponse(BaseModel):
    """Response schema for listing daily logs."""
    daily_logs: List[DailyLogResponse]
    total: int


# =============================================================================
# MATERIAL BASELINE SCHEMAS (Custom baselines per material type)
# =============================================================================

class MaterialBaselineUpdate(BaseModel):
    """Schema for saving/updating a custom material baseline."""
    material_code: str = Field(..., description="Material code (e.g., 'HW', 'D', 'MDF')")
    baseline: float = Field(..., ge=0, le=100, description="Custom baseline percentage")


class MaterialBaselineResponse(BaseModel):
    """Response schema for a material baseline."""
    material_code: str
    baseline: float
    updated_at: Optional[str] = None


class MaterialBaselinesResponse(BaseModel):
    """Response schema for all material baselines."""
    baselines: dict[str, float]  # material_code -> baseline


# =============================================================================
# WIZARD/SETUP SCHEMAS
# =============================================================================

class EquipmentSetup(BaseModel):
    """Equipment with initial count for setup wizard."""
    equipment_type: str = Field(..., description="LGR Dehumidifier, Air Mover, etc.")
    initial_count: int = Field(default=0, ge=0, description="Initial equipment count")


class RoomSetupData(BaseModel):
    """Room data for setup wizard."""
    name: str
    reference_points: List[ReferencePointCreate] = []
    equipment: List[EquipmentSetup] = []  # Equipment with counts
    # Legacy field for backwards compatibility
    equipment_types: List[str] = []  # DEPRECATED: Use equipment instead


class ChamberSetupData(BaseModel):
    """Chamber data for setup wizard."""
    name: str
    chamber_type: ChamberType
    room_ids: List[str] = []  # Rooms to assign to this chamber


class DryingSetupCreate(BaseModel):
    """
    Schema for creating complete drying log setup from wizard.
    Creates drying log, rooms, chambers, reference points, and equipment in one call.
    """
    job_id: int
    start_date: str  # YYYY-MM-DD

    # Setup data
    rooms: List[RoomSetupData]
    chambers: List[ChamberSetupData] = []


class DryingSetupResponse(BaseModel):
    """Response schema after wizard setup."""
    drying_log: DryingLogResponse
    rooms_created: int
    chambers_created: int
    reference_points_created: int
    equipment_types_created: int


# =============================================================================
# DAILY ENTRY SCHEMAS
# =============================================================================

class RoomReadingsEntry(BaseModel):
    """Room readings for daily entry."""
    room_id: str
    readings: List[MoistureReadingCreate]
    equipment_counts: List[EquipmentCountCreate]


class DailyEntryCreate(BaseModel):
    """
    Schema for saving all daily data in one call.
    Includes atmospheric readings, moisture readings, equipment counts, and notes.
    """
    log_date: str  # YYYY-MM-DD
    notes: Optional[str] = None
    atmospheric_readings: List[AtmosphericReadingCreate] = []
    room_entries: List[RoomReadingsEntry] = []


class DailyEntryResponse(BaseModel):
    """Response after saving daily entry."""
    daily_log: DailyLogResponse
    moisture_readings_saved: int
    equipment_counts_saved: int
    atmospheric_readings_saved: int


# Resolve forward references
ChamberResponse.model_rebuild()
RoomResponse.model_rebuild()
DailyLogResponse.model_rebuild()
