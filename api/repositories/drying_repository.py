"""
Drying Tracker Repository

Data access layer for structural drying documentation.
All tables are in the 'business' schema in Supabase.
"""
from typing import Optional, List, Dict, Any
from datetime import date, datetime
from api.repositories.base import BaseRepository
from api.services.supabase_client import get_client, get_service_client
from api.services.supabase_errors import (
    ResourceNotFoundError,
    DatabaseError,
    handle_supabase_error
)
from api.schemas.drying import (
    DryingLogResponse,
    DryingLogFullResponse,
    ChamberResponse,
    RoomResponse,
    ReferencePointResponse,
    MoistureReadingResponse,
    EquipmentResponse,
    EquipmentCountResponse,
    PreviousEquipmentCountResponse,
    DailyLogResponse,
    AtmosphericReadingResponse,
)
from api.utils.gpp import get_condition_level
from database import get_project_full
import logging

logger = logging.getLogger("apex_assistant.drying_repository")


class DryingRepository:
    """
    Repository for drying tracker data access.

    Handles all CRUD operations for drying-related tables.
    Uses business schema in Supabase.
    """

    def __init__(self):
        self.schema = "business"
        self._client = None

    @property
    def client(self):
        """Get Supabase client."""
        return self._client or get_client()

    def _table(self, name: str):
        """Get table reference with business schema."""
        return self.client.schema(self.schema).table(name)

    # =========================================================================
    # DRYING LOG OPERATIONS
    # =========================================================================

    async def get_drying_log_by_job(self, job_id: int) -> Optional[DryingLogResponse]:
        """Get drying log for a specific job."""
        try:
            result = (
                self._table("drying_logs")
                .select("*")
                .eq("job_id", job_id)
                .execute()
            )

            if not result.data:
                return None

            return DryingLogResponse(**result.data[0])
        except Exception as e:
            raise handle_supabase_error(e)

    async def get_drying_log_by_id(self, log_id: str) -> Optional[DryingLogResponse]:
        """Get drying log by its UUID."""
        try:
            result = (
                self._table("drying_logs")
                .select("*")
                .eq("id", log_id)
                .execute()
            )

            if not result.data:
                return None

            return DryingLogResponse(**result.data[0])
        except Exception as e:
            raise handle_supabase_error(e)

    async def get_drying_log_full(self, job_id: int) -> Optional[DryingLogFullResponse]:
        """
        Get complete drying log with all nested data for a job.

        Fetches: chambers, rooms, reference points, equipment, daily logs, atmospheric readings.
        """
        try:
            # Get main drying log
            log_result = (
                self._table("drying_logs")
                .select("*")
                .eq("job_id", job_id)
                .execute()
            )

            if not log_result.data:
                return None

            log_data = log_result.data[0]
            log_id = log_data["id"]

            # Fetch all related data in parallel-ish (Supabase sync client)
            chambers_result = (
                self._table("drying_chambers")
                .select("*")
                .eq("drying_log_id", log_id)
                .order("sort_order")
                .execute()
            )

            rooms_result = (
                self._table("drying_rooms")
                .select("*")
                .eq("drying_log_id", log_id)
                .order("sort_order")
                .execute()
            )

            # Get room IDs for reference points and equipment
            room_ids = [r["id"] for r in rooms_result.data]

            ref_points_data = []
            equipment_data = []
            if room_ids:
                ref_points_result = (
                    self._table("drying_reference_points")
                    .select("*")
                    .in_("room_id", room_ids)
                    .order("sort_order")
                    .execute()
                )
                ref_points_data = ref_points_result.data

                equipment_result = (
                    self._table("drying_equipment")
                    .select("*")
                    .in_("room_id", room_ids)
                    .execute()
                )
                equipment_data = equipment_result.data

            # Get daily logs
            daily_logs_result = (
                self._table("drying_daily_logs")
                .select("*")
                .eq("drying_log_id", log_id)
                .order("log_date", desc=True)
                .execute()
            )

            # Get atmospheric readings for daily logs
            daily_log_ids = [dl["id"] for dl in daily_logs_result.data]
            atmo_data = []
            if daily_log_ids:
                atmo_result = (
                    self._table("drying_atmospheric_readings")
                    .select("*")
                    .in_("daily_log_id", daily_log_ids)
                    .execute()
                )
                atmo_data = atmo_result.data

            # Build nested structures
            # Group reference points by room
            ref_points_by_room = {}
            for rp in ref_points_data:
                room_id = rp["room_id"]
                if room_id not in ref_points_by_room:
                    ref_points_by_room[room_id] = []
                ref_points_by_room[room_id].append(ReferencePointResponse(**rp))

            # Group equipment by room
            equipment_by_room = {}
            for eq in equipment_data:
                room_id = eq["room_id"]
                if room_id not in equipment_by_room:
                    equipment_by_room[room_id] = []
                equipment_by_room[room_id].append(EquipmentResponse(**eq))

            # Build rooms with nested data
            rooms = []
            for r in rooms_result.data:
                room = RoomResponse(
                    **r,
                    reference_points=ref_points_by_room.get(r["id"], []),
                    equipment=equipment_by_room.get(r["id"], [])
                )
                rooms.append(room)

            # Group rooms by chamber for chamber response
            rooms_by_chamber = {}
            for room in rooms:
                chamber_id = room.chamber_id or "unassigned"
                if chamber_id not in rooms_by_chamber:
                    rooms_by_chamber[chamber_id] = []
                rooms_by_chamber[chamber_id].append(room)

            # Build chambers with nested rooms
            chambers = []
            for c in chambers_result.data:
                chamber = ChamberResponse(
                    **c,
                    rooms=rooms_by_chamber.get(c["id"], [])
                )
                chambers.append(chamber)

            # Group atmospheric readings by daily log
            atmo_by_daily_log = {}
            for a in atmo_data:
                dl_id = a["daily_log_id"]
                if dl_id not in atmo_by_daily_log:
                    atmo_by_daily_log[dl_id] = []
                # Add condition level from GPP
                condition_level = None
                if a.get("gpp") is not None:
                    condition_level = get_condition_level(a["gpp"])
                atmo_by_daily_log[dl_id].append(
                    AtmosphericReadingResponse(**a, condition_level=condition_level)
                )

            # Build daily logs with atmospheric readings
            daily_logs = []
            for dl in daily_logs_result.data:
                daily_log = DailyLogResponse(
                    **dl,
                    atmospheric_readings=atmo_by_daily_log.get(dl["id"], [])
                )
                daily_logs.append(daily_log)

            # Calculate summary data
            total_ref_points = sum(len(rp) for rp in ref_points_by_room.values())
            latest_date = daily_logs[0].log_date if daily_logs else None

            # Calculate days active
            days_active = 0
            if log_data.get("start_date"):
                start = datetime.fromisoformat(log_data["start_date"])
                end = datetime.fromisoformat(log_data["end_date"]) if log_data.get("end_date") else datetime.now()
                days_active = (end - start).days + 1

            return DryingLogFullResponse(
                **log_data,
                chambers=chambers,
                rooms=rooms,
                daily_logs=daily_logs,
                total_rooms=len(rooms),
                total_reference_points=total_ref_points,
                days_active=days_active,
                latest_visit_date=latest_date
            )

        except Exception as e:
            logger.error(f"Error fetching full drying log: {e}")
            raise handle_supabase_error(e)

    async def create_drying_log(self, data: Dict[str, Any]) -> DryingLogResponse:
        """Create a new drying log."""
        try:
            result = (
                self._table("drying_logs")
                .insert(data)
                .execute()
            )

            if not result.data:
                raise DatabaseError("Insert returned no data")

            return DryingLogResponse(**result.data[0])
        except Exception as e:
            raise handle_supabase_error(e)

    async def update_drying_log(self, log_id: str, data: Dict[str, Any]) -> DryingLogResponse:
        """Update a drying log."""
        try:
            result = (
                self._table("drying_logs")
                .update(data)
                .eq("id", log_id)
                .execute()
            )

            if not result.data:
                raise ResourceNotFoundError("drying_logs", log_id)

            return DryingLogResponse(**result.data[0])
        except Exception as e:
            raise handle_supabase_error(e)

    async def delete_drying_log(self, log_id: str) -> bool:
        """Delete a drying log (cascades to all related data)."""
        try:
            result = (
                self._table("drying_logs")
                .delete()
                .eq("id", log_id)
                .execute()
            )
            return len(result.data) > 0
        except Exception as e:
            raise handle_supabase_error(e)

    # =========================================================================
    # CHAMBER OPERATIONS
    # =========================================================================

    async def get_chambers(self, log_id: str) -> List[ChamberResponse]:
        """Get all chambers for a drying log."""
        try:
            result = (
                self._table("drying_chambers")
                .select("*")
                .eq("drying_log_id", log_id)
                .order("sort_order")
                .execute()
            )
            return [ChamberResponse(**c) for c in result.data]
        except Exception as e:
            raise handle_supabase_error(e)

    async def create_chamber(self, log_id: str, data: Dict[str, Any]) -> ChamberResponse:
        """Create a new chamber."""
        try:
            data["drying_log_id"] = log_id
            result = (
                self._table("drying_chambers")
                .insert(data)
                .execute()
            )
            return ChamberResponse(**result.data[0])
        except Exception as e:
            raise handle_supabase_error(e)

    async def update_chamber(self, chamber_id: str, data: Dict[str, Any]) -> ChamberResponse:
        """Update a chamber."""
        try:
            result = (
                self._table("drying_chambers")
                .update(data)
                .eq("id", chamber_id)
                .execute()
            )
            if not result.data:
                raise ResourceNotFoundError("drying_chambers", chamber_id)
            return ChamberResponse(**result.data[0])
        except Exception as e:
            raise handle_supabase_error(e)

    async def delete_chamber(self, chamber_id: str) -> bool:
        """Delete a chamber."""
        try:
            result = (
                self._table("drying_chambers")
                .delete()
                .eq("id", chamber_id)
                .execute()
            )
            return len(result.data) > 0
        except Exception as e:
            raise handle_supabase_error(e)

    # =========================================================================
    # ROOM OPERATIONS
    # =========================================================================

    async def get_rooms(self, log_id: str) -> List[RoomResponse]:
        """Get all rooms for a drying log."""
        try:
            result = (
                self._table("drying_rooms")
                .select("*")
                .eq("drying_log_id", log_id)
                .order("sort_order")
                .execute()
            )
            return [RoomResponse(**r) for r in result.data]
        except Exception as e:
            raise handle_supabase_error(e)

    async def create_room(self, log_id: str, data: Dict[str, Any]) -> RoomResponse:
        """Create a new room."""
        try:
            data["drying_log_id"] = log_id
            result = (
                self._table("drying_rooms")
                .insert(data)
                .execute()
            )
            return RoomResponse(**result.data[0])
        except Exception as e:
            raise handle_supabase_error(e)

    async def update_room(self, room_id: str, data: Dict[str, Any]) -> RoomResponse:
        """Update a room."""
        try:
            result = (
                self._table("drying_rooms")
                .update(data)
                .eq("id", room_id)
                .execute()
            )
            if not result.data:
                raise ResourceNotFoundError("drying_rooms", room_id)
            return RoomResponse(**result.data[0])
        except Exception as e:
            raise handle_supabase_error(e)

    async def delete_room(self, room_id: str) -> bool:
        """Delete a room (cascades to reference points and equipment)."""
        try:
            result = (
                self._table("drying_rooms")
                .delete()
                .eq("id", room_id)
                .execute()
            )
            return len(result.data) > 0
        except Exception as e:
            raise handle_supabase_error(e)

    # =========================================================================
    # REFERENCE POINT OPERATIONS
    # =========================================================================

    async def get_reference_points(self, room_id: str) -> List[ReferencePointResponse]:
        """Get all reference points for a room."""
        try:
            result = (
                self._table("drying_reference_points")
                .select("*")
                .eq("room_id", room_id)
                .order("sort_order")
                .execute()
            )
            return [ReferencePointResponse(**rp) for rp in result.data]
        except Exception as e:
            raise handle_supabase_error(e)

    async def create_reference_point(self, room_id: str, data: Dict[str, Any]) -> ReferencePointResponse:
        """Create a new reference point."""
        try:
            data["room_id"] = room_id
            result = (
                self._table("drying_reference_points")
                .insert(data)
                .execute()
            )
            return ReferencePointResponse(**result.data[0])
        except Exception as e:
            raise handle_supabase_error(e)

    async def create_reference_points_bulk(
        self, room_id: str, points: List[Dict[str, Any]]
    ) -> List[ReferencePointResponse]:
        """Create multiple reference points for a room."""
        try:
            for p in points:
                p["room_id"] = room_id

            result = (
                self._table("drying_reference_points")
                .insert(points)
                .execute()
            )
            return [ReferencePointResponse(**rp) for rp in result.data]
        except Exception as e:
            raise handle_supabase_error(e)

    async def update_reference_point(self, point_id: str, data: Dict[str, Any]) -> ReferencePointResponse:
        """Update a reference point."""
        try:
            result = (
                self._table("drying_reference_points")
                .update(data)
                .eq("id", point_id)
                .execute()
            )
            if not result.data:
                raise ResourceNotFoundError("drying_reference_points", point_id)
            return ReferencePointResponse(**result.data[0])
        except Exception as e:
            raise handle_supabase_error(e)

    async def delete_reference_point(self, point_id: str) -> bool:
        """Delete a reference point."""
        try:
            result = (
                self._table("drying_reference_points")
                .delete()
                .eq("id", point_id)
                .execute()
            )
            return len(result.data) > 0
        except Exception as e:
            raise handle_supabase_error(e)

    # =========================================================================
    # MOISTURE READING OPERATIONS
    # =========================================================================

    async def get_moisture_readings(
        self, reference_point_id: str, reading_date: Optional[str] = None
    ) -> List[MoistureReadingResponse]:
        """Get moisture readings for a reference point, optionally filtered by date."""
        try:
            query = (
                self._table("drying_moisture_readings")
                .select("*")
                .eq("reference_point_id", reference_point_id)
            )

            if reading_date:
                query = query.eq("reading_date", reading_date)

            result = query.order("reading_date", desc=True).execute()
            return [MoistureReadingResponse(**r) for r in result.data]
        except Exception as e:
            raise handle_supabase_error(e)

    async def upsert_moisture_readings(
        self, readings: List[Dict[str, Any]]
    ) -> List[MoistureReadingResponse]:
        """
        Insert or update moisture readings (upsert by reference_point_id + reading_date).
        """
        try:
            result = (
                self._table("drying_moisture_readings")
                .upsert(
                    readings,
                    on_conflict="reference_point_id,reading_date"
                )
                .execute()
            )
            return [MoistureReadingResponse(**r) for r in result.data]
        except Exception as e:
            raise handle_supabase_error(e)

    async def get_all_readings_for_date(
        self, drying_log_id: str, reading_date: str
    ) -> Dict[str, Optional[float]]:
        """
        Get all moisture readings for a drying log on a specific date.
        Returns: {reference_point_id: reading_value, ...}
        """
        try:
            # Get all reference points for this drying log via rooms
            rooms_result = (
                self._table("drying_rooms")
                .select("id")
                .eq("drying_log_id", drying_log_id)
                .execute()
            )
            room_ids = [r["id"] for r in rooms_result.data]

            if not room_ids:
                return {}

            # Get all reference points for these rooms
            rp_result = (
                self._table("drying_reference_points")
                .select("id")
                .in_("room_id", room_ids)
                .execute()
            )
            rp_ids = [rp["id"] for rp in rp_result.data]

            if not rp_ids:
                return {}

            # Get all readings for these reference points on the specific date
            readings_result = (
                self._table("drying_moisture_readings")
                .select("reference_point_id, reading_value")
                .in_("reference_point_id", rp_ids)
                .eq("reading_date", reading_date)
                .execute()
            )

            return {
                r["reference_point_id"]: r["reading_value"]
                for r in readings_result.data
            }
        except Exception as e:
            raise handle_supabase_error(e)

    # =========================================================================
    # EQUIPMENT OPERATIONS
    # =========================================================================

    async def get_equipment(self, room_id: str) -> List[EquipmentResponse]:
        """Get all equipment types for a room."""
        try:
            result = (
                self._table("drying_equipment")
                .select("*")
                .eq("room_id", room_id)
                .execute()
            )
            return [EquipmentResponse(**e) for e in result.data]
        except Exception as e:
            raise handle_supabase_error(e)

    async def create_equipment(self, room_id: str, data: Dict[str, Any]) -> EquipmentResponse:
        """Create a new equipment entry."""
        try:
            data["room_id"] = room_id
            result = (
                self._table("drying_equipment")
                .insert(data)
                .execute()
            )
            return EquipmentResponse(**result.data[0])
        except Exception as e:
            raise handle_supabase_error(e)

    async def create_equipment_bulk(
        self, room_id: str, equipment_types: List[str]
    ) -> List[EquipmentResponse]:
        """Create multiple equipment entries for a room."""
        try:
            equipment_data = [
                {"room_id": room_id, "equipment_type": et}
                for et in equipment_types
            ]

            result = (
                self._table("drying_equipment")
                .insert(equipment_data)
                .execute()
            )
            return [EquipmentResponse(**e) for e in result.data]
        except Exception as e:
            raise handle_supabase_error(e)

    async def delete_equipment(self, equipment_id: str) -> bool:
        """Delete an equipment entry."""
        try:
            result = (
                self._table("drying_equipment")
                .delete()
                .eq("id", equipment_id)
                .execute()
            )
            return len(result.data) > 0
        except Exception as e:
            raise handle_supabase_error(e)

    # =========================================================================
    # EQUIPMENT COUNT OPERATIONS
    # =========================================================================

    async def upsert_equipment_counts(
        self, counts: List[Dict[str, Any]]
    ) -> List[EquipmentCountResponse]:
        """
        Insert or update equipment counts (upsert by equipment_id + count_date).
        """
        try:
            result = (
                self._table("drying_equipment_counts")
                .upsert(
                    counts,
                    on_conflict="equipment_id,count_date"
                )
                .execute()
            )
            return [EquipmentCountResponse(**c) for c in result.data]
        except Exception as e:
            raise handle_supabase_error(e)

    async def get_previous_equipment_counts(
        self, drying_log_id: str, current_date: str
    ) -> List[PreviousEquipmentCountResponse]:
        """
        Get equipment counts from the most recent day before current_date.

        Used to pre-populate equipment counts for new visits (day 2+).
        """
        try:
            # Find the most recent daily log before current_date
            prev_log_result = (
                self._table("drying_daily_logs")
                .select("id, log_date")
                .eq("drying_log_id", drying_log_id)
                .lt("log_date", current_date)
                .order("log_date", desc=True)
                .limit(1)
                .execute()
            )

            if not prev_log_result.data:
                return []

            prev_date = prev_log_result.data[0]["log_date"]

            # Get all equipment for this drying log with their counts from prev_date
            # First get all rooms for this drying log
            rooms_result = (
                self._table("drying_rooms")
                .select("id, name")
                .eq("drying_log_id", drying_log_id)
                .execute()
            )

            if not rooms_result.data:
                return []

            room_ids = [r["id"] for r in rooms_result.data]
            room_names = {r["id"]: r["name"] for r in rooms_result.data}

            # Get all equipment for these rooms
            equipment_result = (
                self._table("drying_equipment")
                .select("id, equipment_type, room_id")
                .in_("room_id", room_ids)
                .execute()
            )

            if not equipment_result.data:
                return []

            equipment_ids = [e["id"] for e in equipment_result.data]
            equipment_map = {e["id"]: e for e in equipment_result.data}

            # Get counts for prev_date
            counts_result = (
                self._table("drying_equipment_counts")
                .select("equipment_id, count, count_date")
                .in_("equipment_id", equipment_ids)
                .eq("count_date", prev_date)
                .execute()
            )

            # Build response with equipment details
            previous_counts = []
            for count in counts_result.data:
                equip = equipment_map.get(count["equipment_id"])
                if equip:
                    previous_counts.append(PreviousEquipmentCountResponse(
                        equipment_id=count["equipment_id"],
                        equipment_type=equip["equipment_type"],
                        room_id=equip["room_id"],
                        room_name=room_names.get(equip["room_id"], "Unknown"),
                        count=count["count"],
                        count_date=count["count_date"]
                    ))

            return previous_counts

        except Exception as e:
            logger.error(f"Error getting previous equipment counts: {e}")
            raise handle_supabase_error(e)

    # =========================================================================
    # DAILY LOG OPERATIONS
    # =========================================================================

    async def get_daily_logs(self, log_id: str) -> List[DailyLogResponse]:
        """Get all daily logs for a drying log."""
        try:
            result = (
                self._table("drying_daily_logs")
                .select("*")
                .eq("drying_log_id", log_id)
                .order("log_date", desc=True)
                .execute()
            )
            return [DailyLogResponse(**dl) for dl in result.data]
        except Exception as e:
            raise handle_supabase_error(e)

    async def get_daily_log_by_date(
        self, log_id: str, log_date: str
    ) -> Optional[DailyLogResponse]:
        """Get daily log for a specific date."""
        try:
            result = (
                self._table("drying_daily_logs")
                .select("*")
                .eq("drying_log_id", log_id)
                .eq("log_date", log_date)
                .execute()
            )

            if not result.data:
                return None

            return DailyLogResponse(**result.data[0])
        except Exception as e:
            raise handle_supabase_error(e)

    async def upsert_daily_log(
        self, log_id: str, log_date: str, notes: Optional[str] = None
    ) -> DailyLogResponse:
        """Create or update a daily log."""
        try:
            result = (
                self._table("drying_daily_logs")
                .upsert(
                    {
                        "drying_log_id": log_id,
                        "log_date": log_date,
                        "notes": notes
                    },
                    on_conflict="drying_log_id,log_date"
                )
                .execute()
            )
            return DailyLogResponse(**result.data[0])
        except Exception as e:
            raise handle_supabase_error(e)

    # =========================================================================
    # ATMOSPHERIC READING OPERATIONS
    # =========================================================================

    async def get_atmospheric_readings(
        self, daily_log_id: str
    ) -> List[AtmosphericReadingResponse]:
        """
        Get atmospheric readings for a daily log with joined chamber and equipment names.

        For dehumidifier_exhaust readings, calculates equipment_index for display
        (e.g., "LGR #1", "LGR #2").
        """
        try:
            result = (
                self._table("drying_atmospheric_readings")
                .select("*")
                .eq("daily_log_id", daily_log_id)
                .execute()
            )

            if not result.data:
                return []

            # Collect unique chamber_ids and equipment_ids for lookups
            chamber_ids = set()
            equipment_ids = set()
            for a in result.data:
                if a.get("chamber_id"):
                    chamber_ids.add(a["chamber_id"])
                if a.get("equipment_id"):
                    equipment_ids.add(a["equipment_id"])

            # Fetch chamber names
            chamber_names = {}
            if chamber_ids:
                chambers_result = (
                    self._table("drying_chambers")
                    .select("id, name")
                    .in_("id", list(chamber_ids))
                    .execute()
                )
                chamber_names = {c["id"]: c["name"] for c in chambers_result.data}

            # Fetch equipment details
            equipment_map = {}
            if equipment_ids:
                equipment_result = (
                    self._table("drying_equipment")
                    .select("id, equipment_type, room_id")
                    .in_("id", list(equipment_ids))
                    .execute()
                )
                equipment_map = {e["id"]: e for e in equipment_result.data}

            # For equipment_index: count dehumidifiers per chamber
            # Group by (chamber_id, equipment_type) to number them
            dehu_counts_by_chamber: Dict[str, Dict[str, int]] = {}

            readings = []
            for a in result.data:
                condition_level = None
                if a.get("gpp") is not None:
                    condition_level = get_condition_level(a["gpp"])

                # Get chamber name
                chamber_name = None
                if a.get("chamber_id"):
                    chamber_name = chamber_names.get(a["chamber_id"])

                # Get equipment details and calculate index
                equipment_type = None
                equipment_index = None
                if a.get("equipment_id"):
                    equip = equipment_map.get(a["equipment_id"])
                    if equip:
                        equipment_type = equip["equipment_type"]
                        # Calculate index for this dehumidifier in its chamber
                        chamber_id = a.get("chamber_id", "none")
                        if chamber_id not in dehu_counts_by_chamber:
                            dehu_counts_by_chamber[chamber_id] = {}
                        if equipment_type not in dehu_counts_by_chamber[chamber_id]:
                            dehu_counts_by_chamber[chamber_id][equipment_type] = 0
                        dehu_counts_by_chamber[chamber_id][equipment_type] += 1
                        equipment_index = dehu_counts_by_chamber[chamber_id][equipment_type]

                readings.append(
                    AtmosphericReadingResponse(
                        **a,
                        condition_level=condition_level,
                        chamber_name=chamber_name,
                        equipment_type=equipment_type,
                        equipment_index=equipment_index
                    )
                )

            return readings
        except Exception as e:
            raise handle_supabase_error(e)

    async def upsert_atmospheric_readings(
        self, daily_log_id: str, readings: List[Dict[str, Any]]
    ) -> List[AtmosphericReadingResponse]:
        """
        Insert or update atmospheric readings for a daily log.

        Uses new unique constraint on (daily_log_id, location_type, chamber_id, equipment_id).
        """
        try:
            for r in readings:
                r["daily_log_id"] = daily_log_id
                # Ensure null values for optional fields if not provided
                if "chamber_id" not in r:
                    r["chamber_id"] = None
                if "equipment_id" not in r:
                    r["equipment_id"] = None

            result = (
                self._table("drying_atmospheric_readings")
                .upsert(
                    readings,
                    on_conflict="daily_log_id,location_type,chamber_id,equipment_id"
                )
                .execute()
            )

            return [AtmosphericReadingResponse(**a) for a in result.data]
        except Exception as e:
            raise handle_supabase_error(e)

    # =========================================================================
    # MATERIAL BASELINE OPERATIONS
    # =========================================================================

    async def get_material_baselines(self) -> Dict[str, float]:
        """
        Get all custom material baselines.

        Returns a dict mapping material_code -> baseline value.
        """
        try:
            result = (
                self._table("material_baselines")
                .select("material_code, baseline")
                .execute()
            )

            return {row["material_code"]: float(row["baseline"]) for row in result.data}
        except Exception as e:
            # Table might not exist yet, return empty dict
            logger.warning(f"Could not fetch material baselines: {e}")
            return {}

    async def upsert_material_baseline(
        self, material_code: str, baseline: float
    ) -> Dict[str, Any]:
        """
        Insert or update a custom material baseline.

        Returns the saved baseline record.
        """
        try:
            result = (
                self._table("material_baselines")
                .upsert(
                    {
                        "material_code": material_code,
                        "baseline": baseline
                    },
                    on_conflict="material_code"
                )
                .execute()
            )

            return result.data[0] if result.data else {"material_code": material_code, "baseline": baseline}
        except Exception as e:
            raise handle_supabase_error(e)

    # =========================================================================
    # WIZARD SETUP (CREATE COMPLETE DRYING LOG)
    # =========================================================================

    async def setup_drying_log(
        self,
        job_id: int,
        start_date: str,
        rooms_data: List[Dict[str, Any]],
        chambers_data: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Create a complete drying log setup from wizard data.

        Creates: drying log, rooms, chambers, reference points, equipment.
        Returns summary of what was created.
        """
        try:
            # 1. Create drying log
            log_result = (
                self._table("drying_logs")
                .insert({
                    "job_id": job_id,
                    "start_date": start_date,
                    "status": "active"
                })
                .execute()
            )
            log_id = log_result.data[0]["id"]

            # 2. Create rooms
            rooms_created = 0
            ref_points_created = 0
            equipment_created = 0
            room_id_map = {}  # temp_id -> actual_id

            for i, room_data in enumerate(rooms_data):
                room_result = (
                    self._table("drying_rooms")
                    .insert({
                        "drying_log_id": log_id,
                        "name": room_data["name"],
                        "sort_order": i
                    })
                    .execute()
                )
                room_id = room_result.data[0]["id"]
                room_id_map[f"temp_{i}"] = room_id
                rooms_created += 1

                # Create reference points for this room
                if room_data.get("reference_points"):
                    for j, rp in enumerate(room_data["reference_points"]):
                        self._table("drying_reference_points").insert({
                            "room_id": room_id,
                            "material": rp["material"],
                            "material_code": rp["material_code"],
                            "baseline": rp.get("baseline", 10.0),
                            "saturation": rp.get("saturation"),
                            "sort_order": j
                        }).execute()
                        ref_points_created += 1

                # Create equipment for this room
                # Support both new format (equipment list with counts) and legacy (equipment_types list)
                equipment_with_counts = room_data.get("equipment", [])
                equipment_types_only = room_data.get("equipment_types", [])

                # Track equipment IDs for creating initial counts
                created_equipment = []

                if equipment_with_counts:
                    # New format: equipment with initial counts
                    for eq in equipment_with_counts:
                        eq_result = self._table("drying_equipment").insert({
                            "room_id": room_id,
                            "equipment_type": eq["equipment_type"]
                        }).execute()
                        equipment_created += 1
                        if eq.get("initial_count", 0) > 0:
                            created_equipment.append({
                                "equipment_id": eq_result.data[0]["id"],
                                "count": eq["initial_count"]
                            })
                elif equipment_types_only:
                    # Legacy format: just equipment type names
                    for eq_type in equipment_types_only:
                        self._table("drying_equipment").insert({
                            "room_id": room_id,
                            "equipment_type": eq_type
                        }).execute()
                        equipment_created += 1

                # Create initial equipment counts for day 1 if counts were provided
                if created_equipment:
                    # Create daily log for start_date if needed
                    daily_log_result = (
                        self._table("drying_daily_logs")
                        .upsert(
                            {"drying_log_id": log_id, "log_date": start_date},
                            on_conflict="drying_log_id,log_date"
                        )
                        .execute()
                    )

                    # Create equipment counts for day 1
                    for eq_count in created_equipment:
                        self._table("drying_equipment_counts").insert({
                            "equipment_id": eq_count["equipment_id"],
                            "count_date": start_date,
                            "count": eq_count["count"]
                        }).execute()

            # 3. Create chambers and assign rooms
            chambers_created = 0
            for i, chamber_data in enumerate(chambers_data):
                chamber_result = (
                    self._table("drying_chambers")
                    .insert({
                        "drying_log_id": log_id,
                        "name": chamber_data["name"],
                        "chamber_type": chamber_data["chamber_type"],
                        "sort_order": i
                    })
                    .execute()
                )
                chamber_id = chamber_result.data[0]["id"]
                chambers_created += 1

                # Update rooms to assign to this chamber
                if chamber_data.get("room_ids"):
                    for temp_room_id in chamber_data["room_ids"]:
                        actual_room_id = room_id_map.get(temp_room_id) or temp_room_id
                        self._table("drying_rooms").update({
                            "chamber_id": chamber_id
                        }).eq("id", actual_room_id).execute()

            return {
                "drying_log": DryingLogResponse(**log_result.data[0]),
                "rooms_created": rooms_created,
                "chambers_created": chambers_created,
                "reference_points_created": ref_points_created,
                "equipment_types_created": equipment_created
            }

        except Exception as e:
            logger.error(f"Error in setup_drying_log: {e}")
            raise handle_supabase_error(e)


    # =========================================================================
    # REPORT DATA COLLECTION
    # =========================================================================

    async def get_report_data(self, job_id: int) -> Optional[Dict[str, Any]]:
        """
        Collect all drying data for report generation.

        Returns a dictionary matching the report generator's expected structure:
        - job_info: {location, start_date, end_date, total_days, job_number}
        - client_info: {name, phone_cell, email}
        - insurance_info: {carrier, claim_number, policy_number, date_of_loss}
        - rooms: {room_name: {readings: {material_code: {date: value}}}}
        - dates: [list of date strings YYYY-MM-DD]
        - atmospheric: {location_type: {date: {temp_f, rh_percent, gpp}}}
        - equipment: [{location, type, counts: {date: count}}]
        - material_standards: {material_code: baseline}
        """
        try:
            # 1. Get job/project info from SQLite (not yet migrated to Supabase)
            job = get_project_full(job_id)
            if not job:
                logger.error(f"Job {job_id} not found")
                return None

            # 2. Get drying log
            log_result = (
                self._table("drying_logs")
                .select("*")
                .eq("job_id", job_id)
                .execute()
            )

            if not log_result.data:
                logger.error(f"No drying log found for job {job_id}")
                return None

            drying_log = log_result.data[0]
            log_id = drying_log["id"]

            # 3. Get all daily logs (for dates)
            daily_logs_result = (
                self._table("drying_daily_logs")
                .select("*")
                .eq("drying_log_id", log_id)
                .order("log_date")
                .execute()
            )

            dates = [dl["log_date"] for dl in daily_logs_result.data]
            daily_log_map = {dl["log_date"]: dl for dl in daily_logs_result.data}

            if not dates:
                logger.warning(f"No daily logs found for drying log {log_id}")
                dates = []

            # 4. Get all rooms with reference points
            rooms_result = (
                self._table("drying_rooms")
                .select("*")
                .eq("drying_log_id", log_id)
                .order("sort_order")
                .execute()
            )

            room_map = {r["id"]: r for r in rooms_result.data}
            room_ids = list(room_map.keys())

            # 5. Get all reference points
            ref_points_data = []
            if room_ids:
                ref_points_result = (
                    self._table("drying_reference_points")
                    .select("*")
                    .in_("room_id", room_ids)
                    .order("sort_order")
                    .execute()
                )
                ref_points_data = ref_points_result.data

            ref_point_ids = [rp["id"] for rp in ref_points_data]
            ref_point_map = {rp["id"]: rp for rp in ref_points_data}

            # 6. Get all moisture readings
            moisture_readings_data = []
            if ref_point_ids:
                moisture_result = (
                    self._table("drying_moisture_readings")
                    .select("*")
                    .in_("reference_point_id", ref_point_ids)
                    .execute()
                )
                moisture_readings_data = moisture_result.data

            # 7. Get all atmospheric readings
            daily_log_ids = [dl["id"] for dl in daily_logs_result.data]
            atmo_data = []
            if daily_log_ids:
                atmo_result = (
                    self._table("drying_atmospheric_readings")
                    .select("*")
                    .in_("daily_log_id", daily_log_ids)
                    .execute()
                )
                atmo_data = atmo_result.data

            # Map daily_log_id to date
            daily_log_id_to_date = {dl["id"]: dl["log_date"] for dl in daily_logs_result.data}

            # 8. Get all equipment with counts
            equipment_data = []
            if room_ids:
                equipment_result = (
                    self._table("drying_equipment")
                    .select("*")
                    .in_("room_id", room_ids)
                    .execute()
                )
                equipment_data = equipment_result.data

            equipment_ids = [eq["id"] for eq in equipment_data]
            equipment_counts_data = []
            if equipment_ids:
                counts_result = (
                    self._table("drying_equipment_counts")
                    .select("*")
                    .in_("equipment_id", equipment_ids)
                    .execute()
                )
                equipment_counts_data = counts_result.data

            # 9. Build insurance info (from SQLite v_projects view which already joins organizations)
            insurance_info = {
                "carrier": job.get("insurance_carrier", ""),
                "claim_number": job.get("claim_number"),
                "policy_number": job.get("policy_number"),
                "date_of_loss": job.get("date_of_loss"),
            }

            # Build the report data structure

            # Job info
            job_info = {
                "location": job.get("address", ""),
                "start_date": drying_log.get("start_date"),
                "end_date": drying_log.get("end_date") or (dates[-1] if dates else None),
                "total_days": len(dates),
                "job_number": job.get("job_number"),
            }

            # Client info
            client_info = {
                "name": job.get("client_name", ""),
                "phone_cell": job.get("client_phone", ""),
                "email": job.get("client_email", ""),
            }

            # Build rooms structure with readings grouped by room -> material_code -> date
            rooms = {}
            material_standards = {}

            # Group reference points by room
            rp_by_room = {}
            for rp in ref_points_data:
                room_id = rp["room_id"]
                if room_id not in rp_by_room:
                    rp_by_room[room_id] = []
                rp_by_room[room_id].append(rp)

                # Collect material standards
                material_code = rp.get("material_code", rp.get("material", "Unknown"))
                baseline = rp.get("baseline", 10)
                if material_code not in material_standards:
                    material_standards[material_code] = baseline

            # Build readings by room
            for room_id, room_data in room_map.items():
                room_name = room_data["name"]
                room_readings = {}

                room_ref_points = rp_by_room.get(room_id, [])
                for rp in room_ref_points:
                    material_code = rp.get("material_code", rp.get("material", "Unknown"))

                    # Get readings for this reference point
                    rp_readings = {}
                    for mr in moisture_readings_data:
                        if mr["reference_point_id"] == rp["id"] and mr.get("reading_value") is not None:
                            rp_readings[mr["reading_date"]] = mr["reading_value"]

                    if rp_readings:
                        if material_code not in room_readings:
                            room_readings[material_code] = {}
                        # Merge readings (if multiple points of same material, use last value)
                        for date_str, value in rp_readings.items():
                            room_readings[material_code][date_str] = value

                if room_readings:
                    rooms[room_name] = {"readings": room_readings}

            # Build atmospheric structure
            atmospheric = {}
            for atmo in atmo_data:
                location_type = atmo.get("location_type", "chamber_interior")
                date_str = daily_log_id_to_date.get(atmo["daily_log_id"])

                if not date_str:
                    continue

                if location_type not in atmospheric:
                    atmospheric[location_type] = {}

                atmospheric[location_type][date_str] = {
                    "temp_f": atmo.get("temp_f"),
                    "rh_percent": atmo.get("rh_percent"),
                    "gpp": atmo.get("gpp"),
                }

            # Build equipment structure
            equipment = []
            equipment_counts_by_id = {}
            for ec in equipment_counts_data:
                eq_id = ec["equipment_id"]
                if eq_id not in equipment_counts_by_id:
                    equipment_counts_by_id[eq_id] = {}
                equipment_counts_by_id[eq_id][ec["count_date"]] = ec["count"]

            for eq in equipment_data:
                room_name = room_map.get(eq["room_id"], {}).get("name", "Unknown")
                equipment.append({
                    "location": room_name,
                    "type": eq["equipment_type"],
                    "counts": equipment_counts_by_id.get(eq["id"], {}),
                })

            return {
                "job_info": job_info,
                "client_info": client_info,
                "insurance_info": insurance_info,
                "rooms": rooms,
                "dates": dates,
                "atmospheric": atmospheric,
                "equipment": equipment,
                "material_standards": material_standards,
            }

        except Exception as e:
            logger.error(f"Error collecting report data: {e}")
            raise handle_supabase_error(e)


# Singleton instance
_drying_repository: Optional[DryingRepository] = None


def get_drying_repository() -> DryingRepository:
    """Get singleton drying repository instance."""
    global _drying_repository
    if _drying_repository is None:
        _drying_repository = DryingRepository()
    return _drying_repository
