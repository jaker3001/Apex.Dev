"""
Drying Report Service

Generates professional PDF reports from drying log data.
Matches the format of the reference Structural Drying Report.
"""
from io import BytesIO
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
import logging

logger = logging.getLogger("apex_assistant.drying_report_service")

# =============================================================================
# COLOR DEFINITIONS - Match reference report styling
# =============================================================================

# Header colors
HEADER_BG = colors.HexColor('#2c5282')  # Dark blue
HEADER_TEXT = colors.white

# Row colors
ROW_LIGHT = colors.HexColor('#f7fafc')
ROW_DARK = colors.HexColor('#e2e8f0')
BORDER_COLOR = colors.HexColor('#a0aec0')

# Status colors for moisture readings
DRY_COLOR = colors.HexColor('#48bb78')  # Green
DRYING_COLOR = colors.HexColor('#ecc94b')  # Yellow
WET_COLOR = colors.HexColor('#fc8181')  # Light red
VERY_WET_COLOR = colors.HexColor('#f56565')  # Red

# Cell background colors for moisture readings (lighter versions)
DRY_BG = colors.HexColor('#c6f6d5')
DRYING_BG = colors.HexColor('#fefcbf')
WET_BG = colors.HexColor('#fed7d7')
VERY_WET_BG = colors.HexColor('#feb2b2')


def format_date_short(date_str: str) -> str:
    """Format YYYY-MM-DD to MM/DD/YY."""
    try:
        dt = datetime.strptime(date_str, '%Y-%m-%d')
        return dt.strftime('%m/%d/%y')
    except:
        return date_str


def format_date_display(date_str: str) -> str:
    """Format YYYY-MM-DD to M/D/YYYY."""
    try:
        dt = datetime.strptime(date_str, '%Y-%m-%d')
        return dt.strftime('%-m/%-d/%Y') if hasattr(dt, 'strftime') else dt.strftime('%m/%d/%Y').lstrip('0').replace('/0', '/')
    except:
        return date_str


def get_moisture_status(reading: float, baseline: float) -> Tuple[str, colors.Color, colors.Color]:
    """
    Determine status, text color, and background color based on reading vs baseline.
    Returns (status_text, text_color, bg_color)
    """
    if reading is None:
        return ('-', colors.black, colors.white)

    diff = reading - baseline

    if diff <= 4:
        return ('DRY', DRY_COLOR, DRY_BG)
    elif diff <= 10:
        return ('DRYING', DRYING_COLOR, DRYING_BG)
    elif diff <= 20:
        return ('WET', WET_COLOR, WET_BG)
    else:
        return ('VERY WET', VERY_WET_COLOR, VERY_WET_BG)


def create_styles() -> Dict[str, ParagraphStyle]:
    """Create custom paragraph styles for the report."""
    styles = getSampleStyleSheet()

    custom_styles = {
        'Title': ParagraphStyle(
            'Title',
            parent=styles['Heading1'],
            fontSize=20,
            spaceAfter=12,
            alignment=TA_CENTER,
            textColor=HEADER_BG,
            fontName='Helvetica-Bold',
        ),
        'SectionHeader': ParagraphStyle(
            'SectionHeader',
            parent=styles['Heading2'],
            fontSize=12,
            spaceBefore=16,
            spaceAfter=8,
            textColor=HEADER_BG,
            fontName='Helvetica-Bold',
        ),
        'RoomHeader': ParagraphStyle(
            'RoomHeader',
            parent=styles['Heading3'],
            fontSize=11,
            spaceBefore=12,
            spaceAfter=6,
            textColor=HEADER_BG,
            fontName='Helvetica-Bold',
            backColor=colors.HexColor('#e2e8f0'),
            borderPadding=(4, 4, 4, 4),
        ),
        'Normal': styles['Normal'],
        'Small': ParagraphStyle(
            'Small',
            parent=styles['Normal'],
            fontSize=8,
            textColor=colors.gray,
        ),
        'TableHeader': ParagraphStyle(
            'TableHeader',
            parent=styles['Normal'],
            fontSize=9,
            fontName='Helvetica-Bold',
            textColor=colors.white,
        ),
        'TableCell': ParagraphStyle(
            'TableCell',
            parent=styles['Normal'],
            fontSize=8,
        ),
    }

    return custom_styles


def create_client_info_section(report_data: Dict[str, Any], styles: Dict) -> List:
    """Create the Client Information section with two-column layout."""
    elements = []

    job_info = report_data.get('job_info', {})
    client_info = report_data.get('client_info', {})
    insurance_info = report_data.get('insurance_info', {})

    # Build CLIENT column data
    client_data = [
        ['CLIENT', 'INSURANCE'],
        [f"Name: {client_info.get('name', '')}", f"Loss Date: {insurance_info.get('date_of_loss', '')}"],
        [f"Address: {job_info.get('location', '')}", f"Carrier: {insurance_info.get('carrier', '')}"],
        [f"Phone (C): {client_info.get('phone_cell', '')}", f"Policy #: {insurance_info.get('policy_number', '')}"],
        [f"Email: {client_info.get('email', '')}", f"Claim #: {insurance_info.get('claim_number', '')}"],
    ]

    # Create main client/insurance table
    col_widths = [3.75 * inch, 3.75 * inch]
    table = Table(client_data, colWidths=col_widths)

    table_style = TableStyle([
        # Headers
        ('BACKGROUND', (0, 0), (0, 0), HEADER_BG),
        ('BACKGROUND', (1, 0), (1, 0), HEADER_BG),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        # Content
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('ALIGN', (0, 1), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ])

    # Alternate row colors
    for i in range(1, len(client_data)):
        bg = ROW_LIGHT if i % 2 == 1 else ROW_DARK
        table_style.add('BACKGROUND', (0, i), (-1, i), bg)

    table.setStyle(table_style)
    elements.append(table)

    # Job timeline row
    start_date = job_info.get('start_date', '')
    end_date = job_info.get('end_date', '')
    total_days = job_info.get('total_days', '')

    timeline_data = [[
        f"Job Start: {start_date}",
        f"Equipment Removal: {end_date}",
        f"Total Days: {total_days}"
    ]]

    timeline_table = Table(timeline_data, colWidths=[2.5 * inch, 2.5 * inch, 2.5 * inch])
    timeline_table.setStyle(TableStyle([
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('BACKGROUND', (0, 0), (-1, -1), ROW_DARK),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(timeline_table)

    return elements


def create_material_legend(report_data: Dict[str, Any], styles: Dict) -> List:
    """Create the Moisture Reading Details / Material Code legend."""
    elements = []

    material_standards = report_data.get('material_standards', {})

    if not material_standards:
        return elements

    # Standard material codes mapping
    material_names = {
        'D': 'Sheetrock',
        'Drywall/Sheetrock': 'Sheetrock',
        'P': 'Plaster',
        'I': 'Insulation',
        'C': 'Carpet',
        'TL': 'Tile',
        'SF': 'Subfloor',
        'WF': 'Hard Wood Flooring',
        'FRM': 'Framing (Wood)',
        'CJST': 'Joist (Ceiling)',
        'FJST': 'Joist (Floor)',
        'CW': 'Cabinetry',
        'Laminate': 'Laminate',
    }

    # Build legend data - 4 columns
    items = list(material_standards.items())

    # Create rows with 4 items each (Material, Code, Baseline pairs)
    legend_header = ['Material', 'Code', 'Baseline', '', 'Material', 'Code', 'Baseline', '']
    legend_data = [legend_header]

    # Pair up items for 2 columns of 3 fields each
    for i in range(0, len(items), 2):
        row = []
        # First item
        if i < len(items):
            code, baseline = items[i]
            name = material_names.get(code, code)
            row.extend([name, code, f"{baseline}%", ''])
        else:
            row.extend(['', '', '', ''])

        # Second item
        if i + 1 < len(items):
            code, baseline = items[i + 1]
            name = material_names.get(code, code)
            row.extend([name, code, f"{baseline}%", ''])
        else:
            row.extend(['', '', '', ''])

        legend_data.append(row)

    col_widths = [1.2 * inch, 0.5 * inch, 0.7 * inch, 0.1 * inch] * 2
    table = Table(legend_data, colWidths=col_widths)

    table_style = TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_BG),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('ALIGN', (1, 0), (2, -1), 'CENTER'),
        ('ALIGN', (5, 0), (6, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (2, -1), 0.5, BORDER_COLOR),
        ('GRID', (4, 0), (6, -1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ])

    for i in range(1, len(legend_data)):
        bg = ROW_LIGHT if i % 2 == 1 else ROW_DARK
        table_style.add('BACKGROUND', (0, i), (2, i), bg)
        table_style.add('BACKGROUND', (4, i), (6, i), bg)

    table.setStyle(table_style)
    elements.append(table)

    return elements


def create_room_moisture_table(
    room_name: str,
    readings: Dict[str, Dict[str, float]],
    dates: List[str],
    material_standards: Dict[str, float],
    styles: Dict,
    max_dates_per_row: int = 7
) -> List:
    """Create moisture reading table for a single room."""
    elements = []

    # Room header
    elements.append(Paragraph(room_name.upper(), styles['RoomHeader']))

    if not readings:
        elements.append(Paragraph("No readings recorded.", styles['Normal']))
        return elements

    sorted_dates = sorted(dates)

    # Build reference points list
    ref_points = []
    ref_num = 1
    for material_code, material_readings in readings.items():
        baseline = material_standards.get(material_code, 10)
        ref_points.append({
            'ref': ref_num,
            'code': material_code[:1] if len(material_code) > 3 else material_code,  # Short code
            'full_code': material_code,
            'baseline': baseline,
            'readings': material_readings,
        })
        ref_num += 1

    # Split dates into chunks if needed
    date_chunks = []
    for i in range(0, len(sorted_dates), max_dates_per_row):
        date_chunks.append(sorted_dates[i:i + max_dates_per_row])

    for chunk in date_chunks:
        # Header row
        header = ['Ref', 'Code']
        for d in chunk:
            header.append(format_date_short(d))

        table_data = [header]
        cell_colors = []  # Track colors for each cell

        for rp in ref_points:
            row = [str(rp['ref']), rp['code']]
            row_colors = [None, None]  # No color for ref and code columns

            for d in chunk:
                reading = rp['readings'].get(d)
                if reading is not None:
                    row.append(str(int(round(reading))))
                    _, _, bg_color = get_moisture_status(reading, rp['baseline'])
                    row_colors.append(bg_color)
                else:
                    row.append('-')
                    row_colors.append(None)

            table_data.append(row)
            cell_colors.append(row_colors)

        # Create table
        col_widths = [0.4 * inch, 0.5 * inch]
        col_widths.extend([0.55 * inch] * len(chunk))

        table = Table(table_data, colWidths=col_widths)

        table_style = TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), HEADER_BG),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ])

        # Apply cell colors for readings
        for row_idx, row_colors in enumerate(cell_colors):
            for col_idx, bg_color in enumerate(row_colors):
                if bg_color:
                    table_style.add('BACKGROUND', (col_idx, row_idx + 1), (col_idx, row_idx + 1), bg_color)

        # Alternate row colors for non-colored cells
        for i in range(1, len(table_data)):
            default_bg = ROW_LIGHT if i % 2 == 1 else ROW_DARK
            # Only apply to ref and code columns
            table_style.add('BACKGROUND', (0, i), (1, i), default_bg)

        table.setStyle(table_style)
        elements.append(table)
        elements.append(Spacer(1, 4))

    return elements


def create_moisture_section(report_data: Dict[str, Any], styles: Dict) -> List:
    """Create the complete moisture readings section."""
    elements = []

    rooms = report_data.get('rooms', {})
    dates = report_data.get('dates', [])
    material_standards = report_data.get('material_standards', {})

    if not rooms:
        return elements

    for room_name, room_data in rooms.items():
        readings = room_data.get('readings', {})
        room_elements = create_room_moisture_table(
            room_name, readings, dates, material_standards, styles
        )
        elements.extend(room_elements)
        elements.append(Spacer(1, 8))

    return elements


def create_atmospheric_table(report_data: Dict[str, Any], styles: Dict) -> List:
    """Create atmospheric conditions table with all reading types."""
    elements = []

    atmospheric = report_data.get('atmospheric', {})
    dates = sorted(report_data.get('dates', []))

    if not atmospheric or not dates:
        return elements

    elements.append(Paragraph(
        "Temperature (°F), Relative Humidity (%), and Grains Per Pound (GPP) readings throughout the drying period",
        styles['Small']
    ))
    elements.append(Spacer(1, 6))

    # Mapping for location display names
    location_names = {
        'chamber_interior': 'Chamber',
        'dehumidifier': 'Dehumidifier',
        'unaffected': 'Unaffected',
        'outside': 'Outside',
    }

    # Build header
    header = ['Reading Type']
    for d in dates:
        header.append(format_date_short(d))

    table_data = [header]

    # Add rows for each location type
    for loc_type in ['chamber_interior', 'dehumidifier', 'unaffected', 'outside']:
        loc_data = atmospheric.get(loc_type, {})
        if not loc_data and loc_type not in atmospheric:
            continue

        row = [location_names.get(loc_type, loc_type)]

        for d in dates:
            day_data = loc_data.get(d, {})
            temp = day_data.get('temp_f')
            rh = day_data.get('rh_percent')
            gpp = day_data.get('gpp')

            if temp is not None and rh is not None and gpp is not None:
                cell = f"{int(temp)}° / {int(rh)}% / {gpp:.1f}"
            else:
                cell = '-'
            row.append(cell)

        table_data.append(row)

    # Create table
    col_widths = [1.0 * inch]
    col_widths.extend([1.0 * inch] * len(dates))

    # Adjust widths if too many columns
    if len(dates) > 5:
        col_widths = [0.9 * inch]
        col_widths.extend([0.85 * inch] * len(dates))

    table = Table(table_data, colWidths=col_widths)

    table_style = TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_BG),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('ALIGN', (0, 1), (0, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
    ])

    for i in range(1, len(table_data)):
        bg = ROW_LIGHT if i % 2 == 1 else ROW_DARK
        table_style.add('BACKGROUND', (0, i), (-1, i), bg)

    table.setStyle(table_style)
    elements.append(table)

    return elements


def create_equipment_log_table(report_data: Dict[str, Any], styles: Dict) -> List:
    """Create equipment log table showing daily deployment."""
    elements = []

    equipment = report_data.get('equipment', [])
    dates = sorted(report_data.get('dates', []))

    if not equipment or not dates:
        return elements

    elements.append(Paragraph(
        "Daily equipment deployment by location throughout the drying period",
        styles['Small']
    ))
    elements.append(Spacer(1, 6))

    # Equipment type abbreviations
    eq_abbrev = {
        'Air Mover': 'AM',
        'Dehumidifier': 'DHM',
        'LGR Dehumidifier': 'DHM',
        'Negative Air': 'NAFAN',
        'Air Scrubber': 'NAFAN',
    }

    # Header
    header = ['Location', 'Equipment']
    for d in dates:
        header.append(format_date_short(d))

    table_data = [header]

    for eq in equipment:
        eq_type = eq.get('type', '')
        eq_short = eq_abbrev.get(eq_type, eq_type[:3].upper())

        row = [eq.get('location', ''), eq_short]
        counts = eq.get('counts', {})

        for d in dates:
            count = counts.get(d)
            row.append(str(count) if count else '-')

        table_data.append(row)

    # Create table
    col_widths = [1.2 * inch, 0.7 * inch]
    col_widths.extend([0.55 * inch] * len(dates))

    table = Table(table_data, colWidths=col_widths)

    table_style = TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_BG),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('ALIGN', (0, 1), (0, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ])

    for i in range(1, len(table_data)):
        bg = ROW_LIGHT if i % 2 == 1 else ROW_DARK
        table_style.add('BACKGROUND', (0, i), (-1, i), bg)

    table.setStyle(table_style)
    elements.append(table)

    return elements


def create_equipment_summary(report_data: Dict[str, Any], styles: Dict) -> List:
    """Create equipment summary with totals and equipment days calculation."""
    elements = []

    equipment = report_data.get('equipment', [])
    dates = sorted(report_data.get('dates', []))

    if not equipment:
        return elements

    # Calculate equipment totals
    # Group by equipment type
    type_totals = {}  # {type: {qty: max_count, days: days_used}}
    room_totals = {}  # {room: {type: {qty, days}}}

    for eq in equipment:
        eq_type = eq.get('type', 'Unknown')
        location = eq.get('location', 'Unknown')
        counts = eq.get('counts', {})

        # Count days with equipment
        days_with_eq = sum(1 for d in dates if counts.get(d, 0) > 0)
        max_count = max(counts.values()) if counts else 0

        # Aggregate by type
        if eq_type not in type_totals:
            type_totals[eq_type] = {'qty': 0, 'days': 0, 'equip_days': 0}
        type_totals[eq_type]['qty'] += max_count
        type_totals[eq_type]['days'] = max(type_totals[eq_type]['days'], days_with_eq)
        type_totals[eq_type]['equip_days'] += max_count * days_with_eq

        # Aggregate by room
        if location not in room_totals:
            room_totals[location] = {}
        if eq_type not in room_totals[location]:
            room_totals[location][eq_type] = {'qty': 0, 'days': 0, 'equip_days': 0}
        room_totals[location][eq_type]['qty'] += max_count
        room_totals[location][eq_type]['days'] = max(room_totals[location][eq_type]['days'], days_with_eq)
        room_totals[location][eq_type]['equip_days'] += max_count * days_with_eq

    # Job Totals table
    elements.append(Paragraph("Job Totals", styles['RoomHeader']))

    totals_header = ['Equipment Type', 'Qty', 'Days', 'Equipment Days']
    totals_data = [totals_header]

    for eq_type, data in type_totals.items():
        totals_data.append([
            eq_type,
            str(data['qty']),
            str(data['days']),
            str(data['equip_days'])
        ])

    totals_table = Table(totals_data, colWidths=[2 * inch, 0.7 * inch, 0.7 * inch, 1.2 * inch])
    totals_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_BG),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('BACKGROUND', (0, 1), (-1, -1), ROW_LIGHT),
    ]))
    elements.append(totals_table)
    elements.append(Spacer(1, 12))

    # By Room table
    elements.append(Paragraph("By Room", styles['RoomHeader']))

    room_header = ['Room', 'Equipment Type', 'Qty', 'Days', 'Equip Days']
    room_data = [room_header]

    for room, types in room_totals.items():
        for eq_type, data in types.items():
            room_data.append([
                room,
                eq_type,
                str(data['qty']),
                str(data['days']),
                str(data['equip_days'])
            ])

    room_table = Table(room_data, colWidths=[1.5 * inch, 1.5 * inch, 0.6 * inch, 0.6 * inch, 0.9 * inch])

    room_style = TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_BG),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (2, 0), (-1, -1), 'CENTER'),
        ('ALIGN', (0, 0), (1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ])

    for i in range(1, len(room_data)):
        bg = ROW_LIGHT if i % 2 == 1 else ROW_DARK
        room_style.add('BACKGROUND', (0, i), (-1, i), bg)

    room_table.setStyle(room_style)
    elements.append(room_table)

    return elements


def build_story(report_data: Dict[str, Any], styles: Dict) -> List:
    """Build the complete story (content) for the PDF."""
    story = []

    # Title
    story.append(Paragraph("STRUCTURAL DRYING REPORT", styles['Title']))
    story.append(Spacer(1, 12))

    # Client Information Section
    story.append(Paragraph("Client Information", styles['SectionHeader']))
    story.extend(create_client_info_section(report_data, styles))
    story.append(Spacer(1, 16))

    # Moisture Reading Details (Material Legend)
    story.append(Paragraph("Moisture Reading Details", styles['SectionHeader']))
    story.extend(create_material_legend(report_data, styles))
    story.append(Spacer(1, 16))

    # Room-by-room moisture readings
    story.extend(create_moisture_section(report_data, styles))

    # Page break before atmospheric
    story.append(PageBreak())

    # Atmospheric Conditions
    story.append(Paragraph("Atmospheric Conditions", styles['SectionHeader']))
    story.extend(create_atmospheric_table(report_data, styles))
    story.append(Spacer(1, 20))

    # Equipment Log
    story.append(Paragraph("Equipment Log", styles['SectionHeader']))
    story.extend(create_equipment_log_table(report_data, styles))
    story.append(Spacer(1, 20))

    # Equipment Summary
    story.append(Paragraph("Equipment Summary", styles['SectionHeader']))
    story.extend(create_equipment_summary(report_data, styles))
    story.append(Spacer(1, 20))

    # Footer
    story.append(Spacer(1, 20))
    story.append(Paragraph(
        "Report generated by Apex Restoration LLC",
        styles['Small']
    ))

    return story


class DryingReportService:
    """
    Service for generating structural drying reports.

    Takes collected drying data and produces a professional PDF report
    matching the reference format.
    """

    def generate(self, report_data: Dict[str, Any]) -> bytes:
        """
        Generate a PDF report from drying log data.

        Args:
            report_data: Dictionary containing:
                - job_info: {location, start_date, end_date, total_days, job_number}
                - client_info: {name, phone_cell, email}
                - insurance_info: {carrier, claim_number, policy_number, date_of_loss}
                - rooms: {room_name: {readings: {material_code: {date: value}}}}
                - dates: [list of date strings YYYY-MM-DD]
                - atmospheric: {location_type: {date: {temp_f, rh_percent, gpp}}}
                - equipment: [{location, type, counts: {date: count}}]
                - material_standards: {material_code: baseline}

        Returns:
            PDF file as bytes
        """
        logger.info("Generating drying report PDF")

        # Create in-memory buffer
        buffer = BytesIO()

        # Create document
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=0.5 * inch,
            leftMargin=0.5 * inch,
            topMargin=0.5 * inch,
            bottomMargin=0.5 * inch,
        )

        # Create styles
        styles = create_styles()

        # Build story
        story = build_story(report_data, styles)

        # Generate PDF
        doc.build(story)

        # Get bytes
        pdf_bytes = buffer.getvalue()
        buffer.close()

        logger.info(f"Generated PDF report: {len(pdf_bytes)} bytes")

        return pdf_bytes


# Singleton instance
_drying_report_service: Optional[DryingReportService] = None


def get_drying_report_service() -> DryingReportService:
    """Get singleton drying report service instance."""
    global _drying_report_service
    if _drying_report_service is None:
        _drying_report_service = DryingReportService()
    return _drying_report_service
