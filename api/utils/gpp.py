"""
GPP (Grains per Pound) Calculator

Uses IAPWS formulas for psychrometric calculations.
GPP is a key metric for water damage restoration - it indicates
the moisture content in the air.

Reference levels:
- < 40: Low (Good drying conditions)
- 40-60: Moderate (Comfortable)
- 60-100: High (Active drying needed)
- 100-135: Very High (Aggressive drying required)
- > 135: Near Saturation (Check for ongoing water intrusion)
"""

import math
from typing import Optional, Tuple
from dataclasses import dataclass


@dataclass
class GppResult:
    """Result of GPP calculation with condition assessment."""
    gpp: float
    condition: str


def calculate_gpp(
    temp_f: float,
    rh_percent: float,
    pressure_psia: float = 14.696
) -> float:
    """
    Calculate Grains Per Pound (GPP) from temperature and relative humidity.

    Uses IAPWS (International Association for the Properties of Water and Steam)
    formulas for psychrometric calculations.

    Args:
        temp_f: Temperature in Fahrenheit
        rh_percent: Relative humidity as a percentage (0-100)
        pressure_psia: Atmospheric pressure in psia (default: 14.696 at sea level)

    Returns:
        GPP value rounded to 1 decimal place

    Example:
        >>> calculate_gpp(72, 50)
        58.4
    """
    # Step 1: Convert temperature to Rankine
    temp_r = temp_f + 459.67

    # Step 2: Calculate saturation vapor pressure (IAPWS formula)
    # Natural log of saturation pressure (psia)
    ln_pws = (
        -10440.397 / temp_r
        - 11.29465
        - 0.027022355 * temp_r
        + 0.00001289036 * (temp_r ** 2)
        - 0.0000000024780681 * (temp_r ** 3)
        + 6.5459673 * math.log(temp_r)
    )

    # Convert from natural log to actual pressure
    pws = math.exp(ln_pws)

    # Step 3: Calculate actual vapor pressure from relative humidity
    pw = (rh_percent / 100) * pws

    # Step 4: Calculate humidity ratio
    # Avoid division by zero if pw approaches pressure_psia
    denominator = pressure_psia - pw
    if denominator <= 0:
        denominator = 0.001  # Prevent division by zero

    w = 0.62198 * pw / denominator

    # Step 5: Convert to grains per pound
    gpp = w * 7000

    # Round to 1 decimal place
    return round(gpp, 1)


def assess_moisture_condition(gpp: float) -> str:
    """
    Assess moisture condition based on GPP value.

    Args:
        gpp: Grains Per Pound value

    Returns:
        Human-readable condition description
    """
    if gpp < 40:
        return "Low (Good drying)"
    elif gpp < 60:
        return "Moderate (Comfortable)"
    elif gpp < 100:
        return "High (Active drying needed)"
    elif gpp < 135:
        return "Very High (Aggressive drying required)"
    else:
        return "Near Saturation (Check for ongoing water intrusion)"


def get_condition_level(gpp: float) -> str:
    """
    Get simple condition level for UI styling.

    Args:
        gpp: Grains Per Pound value

    Returns:
        'good', 'moderate', 'high', 'very_high', or 'critical'
    """
    if gpp < 40:
        return "good"
    elif gpp < 60:
        return "moderate"
    elif gpp < 100:
        return "high"
    elif gpp < 135:
        return "very_high"
    else:
        return "critical"


def validate_inputs(temp_f: float, rh_percent: float) -> Optional[str]:
    """
    Validate temperature and humidity inputs.

    Args:
        temp_f: Temperature in Fahrenheit
        rh_percent: Relative humidity percentage

    Returns:
        Error message if invalid, None if valid
    """
    if temp_f < 32 or temp_f > 120:
        return f"Temperature {temp_f}°F is out of normal range (32-120°F)"

    if rh_percent < 0 or rh_percent > 100:
        return f"Relative humidity {rh_percent}% is out of valid range (0-100%)"

    return None


def calculate_gpp_with_assessment(
    temp_f: float,
    rh_percent: float,
    pressure_psia: float = 14.696
) -> GppResult:
    """
    Calculate GPP and assess condition in one call.

    Args:
        temp_f: Temperature in Fahrenheit
        rh_percent: Relative humidity percentage
        pressure_psia: Atmospheric pressure in psia

    Returns:
        GppResult with gpp value and condition string
    """
    gpp = calculate_gpp(temp_f, rh_percent, pressure_psia)
    condition = assess_moisture_condition(gpp)
    return GppResult(gpp=gpp, condition=condition)
