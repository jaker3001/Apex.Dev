"""
Weather API routes.
Uses Open-Meteo (free, no API key required) for weather data.
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
import httpx
from datetime import datetime

from api.routes.auth import require_auth
from api.schemas.hub import (
    WeatherResponse,
    WeatherCondition,
    WeatherForecastDay,
)

router = APIRouter()

# Open-Meteo API (free, no key required)
OPEN_METEO_BASE = "https://api.open-meteo.com/v1"

# Default location: Lakewood, CO (can be made configurable later)
DEFAULT_LAT = 39.7047
DEFAULT_LON = -105.0814
DEFAULT_LOCATION = "Lakewood, CO"

# WMO Weather interpretation codes
WMO_CODES = {
    0: ("Clear sky", "sun"),
    1: ("Mainly clear", "sun"),
    2: ("Partly cloudy", "cloud-sun"),
    3: ("Overcast", "cloud"),
    45: ("Fog", "cloud-fog"),
    48: ("Depositing rime fog", "cloud-fog"),
    51: ("Light drizzle", "cloud-rain"),
    53: ("Moderate drizzle", "cloud-rain"),
    55: ("Dense drizzle", "cloud-rain"),
    56: ("Light freezing drizzle", "cloud-rain"),
    57: ("Dense freezing drizzle", "cloud-rain"),
    61: ("Slight rain", "cloud-rain"),
    63: ("Moderate rain", "cloud-rain"),
    65: ("Heavy rain", "cloud-rain"),
    66: ("Light freezing rain", "cloud-rain"),
    67: ("Heavy freezing rain", "cloud-rain"),
    71: ("Slight snow fall", "cloud-snow"),
    73: ("Moderate snow fall", "cloud-snow"),
    75: ("Heavy snow fall", "cloud-snow"),
    77: ("Snow grains", "cloud-snow"),
    80: ("Slight rain showers", "cloud-rain"),
    81: ("Moderate rain showers", "cloud-rain"),
    82: ("Violent rain showers", "cloud-rain"),
    85: ("Slight snow showers", "cloud-snow"),
    86: ("Heavy snow showers", "cloud-snow"),
    95: ("Thunderstorm", "cloud-lightning"),
    96: ("Thunderstorm with slight hail", "cloud-lightning"),
    99: ("Thunderstorm with heavy hail", "cloud-lightning"),
}


def get_weather_condition(code: int) -> tuple[str, str]:
    """Get weather condition text and icon from WMO code."""
    return WMO_CODES.get(code, ("Unknown", "cloud"))


def celsius_to_fahrenheit(c: float) -> float:
    """Convert Celsius to Fahrenheit."""
    return round((c * 9/5) + 32, 1)


def wind_direction_from_degrees(degrees: float) -> str:
    """Convert wind direction degrees to cardinal direction."""
    directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
                  "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"]
    idx = int((degrees + 11.25) / 22.5) % 16
    return directions[idx]


@router.get("/weather", response_model=WeatherResponse)
async def get_weather(
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    location: Optional[str] = None,
    current_user = Depends(require_auth)
):
    """Get current weather and forecast."""
    # Use defaults if not provided
    latitude = lat or DEFAULT_LAT
    longitude = lon or DEFAULT_LON
    location_name = location or DEFAULT_LOCATION

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Fetch current weather and forecast
            response = await client.get(
                f"{OPEN_METEO_BASE}/forecast",
                params={
                    "latitude": latitude,
                    "longitude": longitude,
                    "current": "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m",
                    "daily": "temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max",
                    "temperature_unit": "celsius",
                    "wind_speed_unit": "mph",
                    "timezone": "America/Denver",
                    "forecast_days": 7
                }
            )

            if response.status_code != 200:
                raise HTTPException(
                    status_code=502,
                    detail="Failed to fetch weather data"
                )

            data = response.json()

            # Parse current weather
            current = data.get("current", {})
            current_code = current.get("weather_code", 0)
            condition_text, icon = get_weather_condition(current_code)

            current_weather = WeatherCondition(
                temp_f=celsius_to_fahrenheit(current.get("temperature_2m", 0)),
                temp_c=round(current.get("temperature_2m", 0), 1),
                condition=condition_text,
                icon=icon,
                humidity=current.get("relative_humidity_2m", 0),
                wind_mph=round(current.get("wind_speed_10m", 0), 1),
                wind_direction=wind_direction_from_degrees(current.get("wind_direction_10m", 0)),
                feels_like_f=celsius_to_fahrenheit(current.get("apparent_temperature", 0)),
                feels_like_c=round(current.get("apparent_temperature", 0), 1)
            )

            # Parse daily forecast
            daily = data.get("daily", {})
            forecast = []

            dates = daily.get("time", [])
            max_temps = daily.get("temperature_2m_max", [])
            min_temps = daily.get("temperature_2m_min", [])
            codes = daily.get("weather_code", [])
            precip_probs = daily.get("precipitation_probability_max", [])

            for i in range(min(7, len(dates))):
                code = codes[i] if i < len(codes) else 0
                cond_text, cond_icon = get_weather_condition(code)

                # Determine chance of snow vs rain based on condition
                precip = precip_probs[i] if i < len(precip_probs) else 0
                is_snow = code in [71, 73, 75, 77, 85, 86]

                forecast.append(WeatherForecastDay(
                    date=dates[i],
                    high_f=celsius_to_fahrenheit(max_temps[i]) if i < len(max_temps) else 0,
                    low_f=celsius_to_fahrenheit(min_temps[i]) if i < len(min_temps) else 0,
                    condition=cond_text,
                    icon=cond_icon,
                    chance_of_rain=0 if is_snow else precip,
                    chance_of_snow=precip if is_snow else 0
                ))

            # Generate alerts based on conditions
            alerts = []
            if current_weather.temp_f < 32:
                alerts.append("Freezing temperatures - watch for ice on roads")
            if any(f.chance_of_snow > 50 for f in forecast[:2]):
                alerts.append("Snow expected in the next 48 hours")
            if current_weather.wind_mph > 25:
                alerts.append("High winds - secure loose materials")

            return WeatherResponse(
                location=location_name,
                current=current_weather,
                forecast=forecast,
                alerts=alerts,
                last_updated=datetime.now().isoformat()
            )

    except httpx.RequestError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Weather service unavailable: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process weather data: {str(e)}"
        )


@router.get("/weather/alerts")
async def get_weather_alerts(
    current_user = Depends(require_auth)
):
    """Get just weather alerts (for notification integration)."""
    weather = await get_weather(current_user=current_user)
    return {"alerts": weather.alerts}
