from datetime import timezone
"""
Climate Intelligence Service
=============================
Provides season and temperature context for the Smart Energy recommendation engine.
- Primary: OpenWeatherMap API (free tier, 60 calls/min)
- Fallback: Date-based season detection for Sindh/Pakistan climate zones
- Caching: 10-minute TTL to avoid API spam
"""

import os
import time
import requests
from datetime import datetime, timedelta

# ── Configuration ──────────────────────────────────────────────
OPENWEATHER_API_KEY = os.getenv('OPENWEATHER_API_KEY', '')
UNIVERSITY_LAT = float(os.getenv('UNIVERSITY_LAT', '26.4431'))   # Jamshoro
UNIVERSITY_LON = float(os.getenv('UNIVERSITY_LON', '67.7272'))   # Sindh, Pakistan
UNIVERSITY_CITY = os.getenv('UNIVERSITY_CITY', 'Jamshoro')

# ── Cache ──────────────────────────────────────────────────────
_cache = {
    'data': None,
    'timestamp': 0,
    'ttl': 600  # 10 minutes
}


def _get_pakistan_season(month):
    """
    Determine the season based on Pakistan/Sindh climate calendar.
    Sindh has extreme summers (Mar-Jun), monsoon humidity (Jul-Sep),
    mild autumn (Oct-Nov), and cool winters (Dec-Feb).
    """
    if month in (3, 4, 5, 6):
        return {
            'season': 'summer',
            'season_label': 'Summer',
            'season_icon': '🔥',
            'typical_temp_range': '35–48°C',
            'description': 'Extreme heat season in Sindh. Cooling systems are essential for human comfort.'
        }
    elif month in (7, 8, 9):
        return {
            'season': 'monsoon',
            'season_label': 'Monsoon',
            'season_icon': '🌧️',
            'typical_temp_range': '30–38°C',
            'description': 'Hot and humid monsoon season. Ventilation and dehumidification are critical.'
        }
    elif month in (10, 11):
        return {
            'season': 'autumn',
            'season_label': 'Autumn',
            'season_icon': '🍂',
            'typical_temp_range': '25–32°C',
            'description': 'Moderate temperatures. Natural ventilation is often sufficient.'
        }
    else:  # 12, 1, 2
        return {
            'season': 'winter',
            'season_label': 'Winter',
            'season_icon': '❄️',
            'typical_temp_range': '10–22°C',
            'description': 'Cool winter season. Cooling systems are unnecessary; energy can be fully conserved.'
        }


def _classify_climate_mode(temperature):
    """
    Classify the current climate into an actionable mode for the rule engine.
    
    Returns one of:
        - extreme_heat: >38°C → AC essential even at low occupancy
        - hot_humid:    30–38°C → Fans critical, AC helpful
        - moderate:     22–30°C → Fans sufficient, AC unnecessary
        - cool:         <22°C → No cooling needed
    """
    if temperature is None:
        return 'moderate'  # Safe default
    
    if temperature > 38:
        return 'extreme_heat'
    elif temperature > 30:
        return 'hot_humid'
    elif temperature > 22:
        return 'moderate'
    else:
        return 'cool'


def _estimate_temperature_from_season(season, month):
    """
    When no API is available, estimate a reasonable temperature
    based on the specific month and time of day for Jamshoro, Sindh.
    """
    # Get current hour (UTC+5 for Pakistan)
    user_hour = (datetime.now(timezone.utc) + timedelta(hours=5)).hour
    
    # Precise historical averages for Jamshoro
    monthly_day_temps = {
        1: 24, 2: 28, 3: 34, 4: 37, 5: 43, 6: 42,
        7: 38, 8: 36, 9: 37, 10: 36, 11: 31, 12: 26
    }
    monthly_night_temps = {
        1: 11, 2: 14, 3: 19, 4: 24, 5: 28, 6: 29,
        7: 28, 8: 27, 9: 26, 10: 22, 11: 17, 12: 12
    }
    
    day_temp = monthly_day_temps.get(month, 35)
    night_temp = monthly_night_temps.get(month, 25)
    
    # Simple day/night/evening interpolation
    if 8 <= user_hour <= 17:
        return day_temp
    elif 18 <= user_hour <= 21:
        return round((day_temp + night_temp) / 2)
    else:
        return night_temp


def _fetch_from_api():
    """
    Fetch real-time weather from OpenWeatherMap.
    Returns dict with temperature, humidity, weather description, or None on failure.
    """
    if not OPENWEATHER_API_KEY:
        return None
    
    try:
        url = 'https://api.openweathermap.org/data/2.5/weather'
        params = {
            'lat': UNIVERSITY_LAT,
            'lon': UNIVERSITY_LON,
            'appid': OPENWEATHER_API_KEY,
            'units': 'metric'  # Celsius
        }
        response = requests.get(url, params=params, timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            return {
                'temperature': round(data['main']['temp'], 1),
                'feels_like': round(data['main']['feels_like'], 1),
                'humidity': data['main']['humidity'],
                'weather': data['weather'][0]['description'] if data.get('weather') else 'clear',
                'wind_speed': data.get('wind', {}).get('speed', 0),
                'source': 'api'
            }
        else:
            print(f"[WARN] Climate API: HTTP {response.status_code}")
            return None
    except Exception as e:
        print(f"[WARN] Climate API Error: {e}")
        return None


def get_climate_context():
    """
    Main entry point: Returns the complete climate context for the recommendation engine.
    Uses cached data if available, otherwise fetches fresh data.
    
    Returns:
        dict: {
            'season': str,              # 'summer', 'monsoon', 'autumn', 'winter'
            'season_label': str,        # 'Summer', 'Monsoon', etc.
            'season_icon': str,         # emoji
            'temperature': float,       # Current temp in °C
            'feels_like': float,        # Feels-like temp in °C
            'humidity': int,            # Humidity percentage
            'climate_mode': str,        # 'extreme_heat', 'hot_humid', 'moderate', 'cool'
            'description': str,         # Human-readable description
            'city': str,                # University city
            'source': str,              # 'api' or 'estimated'
            'typical_temp_range': str,  # Expected range for the season
        }
    """
    now = time.time()
    
    # Return cached data if still valid
    if _cache['data'] and (now - _cache['timestamp']) < _cache['ttl']:
        return _cache['data']
    
    # Get season info from current date
    user_now = datetime.now(timezone.utc) + timedelta(hours=5)  # UTC+5 Pakistan
    season_info = _get_pakistan_season(user_now.month)
    
    # Try API first, fall back to estimation
    api_data = _fetch_from_api()
    
    if api_data:
        temperature = api_data['temperature']
        feels_like = api_data['feels_like']
        humidity = api_data['humidity']
        weather_desc = api_data['weather']
        source = 'api'
    else:
        temperature = _estimate_temperature_from_season(season_info['season'], user_now.month)
        feels_like = temperature + 2  # Rough feels-like offset
        humidity = {'summer': 25, 'monsoon': 75, 'autumn': 45, 'winter': 40}.get(season_info['season'], 40)
        weather_desc = season_info['description']
        source = 'estimated'
    
    climate_mode = _classify_climate_mode(temperature)
    
    # Build climate mode labels
    mode_labels = {
        'extreme_heat': {'label': 'Extreme Heat Advisory', 'color': '#ef4444', 'icon': '🔥'},
        'hot_humid': {'label': 'Hot & Humid', 'color': '#f59e0b', 'icon': '🌡️'},
        'moderate': {'label': 'Moderate Climate', 'color': '#10b981', 'icon': '🍃'},
        'cool': {'label': 'Cool Weather', 'color': '#06b6d4', 'icon': '❄️'}
    }
    
    mode_info = mode_labels.get(climate_mode, mode_labels['moderate'])
    
    result = {
        **season_info,
        'temperature': temperature,
        'feels_like': feels_like,
        'humidity': humidity,
        'climate_mode': climate_mode,
        'climate_mode_label': mode_info['label'],
        'climate_mode_color': mode_info['color'],
        'climate_mode_icon': mode_info['icon'],
        'weather': weather_desc,
        'city': UNIVERSITY_CITY,
        'source': source,
        'timestamp': user_now.isoformat()
    }
    
    # Cache the result
    _cache['data'] = result
    _cache['timestamp'] = now
    
    return result


def get_device_overrides(occupancy_level, climate_mode):
    """
    The core rule engine: Given an occupancy level (0-4) and climate mode,
    return the optimal device states.
    
    LEVELS (5-Tier System):
    0 = Empty (0%)
    1 = Trace (1-15%) - STUDENT PRESENCE MODE
    2 = Light (16-40%)
    3 = Balanced (41-75%)
    4 = Maximum (76-100%)
    """
    
    # ── SEASONAL LOCK (SAFETY FIRST) ───────────────────────────
    # If it's winter, AC is ALWAYS OFF, regardless of occupancy.
    # This prevents "throwing arrows in the dark" during cool seasons.
    is_winter = climate_mode == 'cool'
    
    # ── RECOMMENDATION MATRIX ──────────────────────────────────
    matrix = {
        # ── EXTREME HEAT (>38°C) ──────────────────────────────
        ('extreme_heat', 0): { 
            'lights': 'OFF', 'ac': 'OFF', 'fan': 'OFF',
            'recommendation': 'System Dormant — Room Empty',
            'reasoning': 'Despite extreme heat ({temp}), the room is empty. All systems are off to conserve energy.',
            'energy_mode': 'eco'
        },
        ('extreme_heat', 1): { # TRACE PRESENCE
            'lights': 'DIM (50%)', 'ac': 'OFF', 'fan': 'ON',
            'recommendation': 'Student Presence Detected — Fans ON, AC OFF',
            'reasoning': 'Minimal occupancy (Trace). For student comfort in extreme heat ({temp}), fans are active, but AC is withheld to prevent heavy energy waste for 1-2 people.',
            'energy_mode': 'eco'
        },
        ('extreme_heat', 2): {
            'lights': 'ON', 'ac': 'ECO', 'fan': 'ON',
            'recommendation': 'Light Occupancy — AC Eco Mode',
            'reasoning': 'Heat index is critical ({temp}). AC running in Eco mode to prevent room from overheating for light occupancy.',
            'energy_mode': 'balanced'
        },
        ('extreme_heat', 3): {
            'lights': 'ON', 'ac': 'ON', 'fan': 'HIGH',
            'recommendation': 'Balanced Occupancy — Active Cooling',
            'reasoning': 'Significant occupancy in extreme heat ({temp}). Active AC and high-speed fans required for productivity.',
            'energy_mode': 'comfort'
        },
        ('extreme_heat', 4): {
            'lights': 'ON', 'ac': 'FULL', 'fan': 'HIGH',
            'recommendation': 'Maximum Capacity — Full Power Cooling',
            'reasoning': 'Full classroom in extreme heat ({temp}). All cooling units at maximum for student safety.',
            'energy_mode': 'full'
        },
        
        # ── HOT & HUMID (30–38°C) ─────────────────────────────
        ('hot_humid', 0): { 'lights': 'OFF', 'ac': 'OFF', 'fan': 'OFF', 'recommendation': 'Off', 'reasoning': 'Empty', 'energy_mode': 'eco' },
        ('hot_humid', 1): { 
            'lights': 'DIM (50%)', 'ac': 'OFF', 'fan': 'ON',
            'recommendation': 'Trace Presence — Fans ON',
            'reasoning': 'Trace occupancy. Fans provide sufficient airflow in humid conditions ({temp}). AC off.',
            'energy_mode': 'eco'
        },
        ('hot_humid', 2): { 
            'lights': 'ON', 'ac': 'OFF', 'fan': 'ON',
            'recommendation': 'Light Occupancy — Ventilation Mode',
            'reasoning': 'Warm/Humid ({temp}). Fans sufficient for light occupancy. Energy conserved by keeping AC off.',
            'energy_mode': 'balanced'
        },
        ('hot_humid', 3): { 
            'lights': 'ON', 'ac': 'ECO', 'fan': 'ON',
            'recommendation': 'Balanced Occupancy — Smart AC',
            'reasoning': 'Significant occupancy. AC in Eco mode for dehumidification and comfort.',
            'energy_mode': 'balanced'
        },
        ('hot_humid', 4): { 
            'lights': 'ON', 'ac': 'ON', 'fan': 'HIGH',
            'recommendation': 'Full Capacity — Active Cooling',
            'reasoning': 'Large group in humid weather ({temp}). AC on for comfort.',
            'energy_mode': 'comfort'
        },
        
        # ── MODERATE (22–30°C) ─────────────────────────────────
        ('moderate', 0): { 'lights': 'OFF', 'ac': 'OFF', 'fan': 'OFF', 'recommendation': 'Off', 'reasoning': 'Empty', 'energy_mode': 'eco' },
        ('moderate', 1): { 
            'lights': 'DIM (50%)', 'ac': 'OFF', 'fan': 'ON',
            'recommendation': 'Trace Presence — Lights/Fans ON',
            'reasoning': 'Minimal occupancy. Essential lighting and ventilation provided for students.',
            'energy_mode': 'eco'
        },
        ('moderate', 2): { 'lights': 'ON', 'ac': 'OFF', 'fan': 'ON', 'recommendation': 'Natural Comfort', 'reasoning': 'Moderate weather ({temp}). Fans only.', 'energy_mode': 'balanced' },
        ('moderate', 3): { 'lights': 'ON', 'ac': 'OFF', 'fan': 'ON', 'recommendation': 'Balanced Ventilation', 'reasoning': 'Moderate weather. AC unnecessary.', 'energy_mode': 'balanced' },
        ('moderate', 4): { 'lights': 'ON', 'ac': 'ECO', 'fan': 'ON', 'recommendation': 'High Capacity — Eco AC', 'reasoning': 'Full room generating body heat. Eco AC used to stabilize temperature.', 'energy_mode': 'balanced' },
        
        # ── COOL (<22°C) ──────────────────────────────────────
        ('cool', 0): { 'lights': 'OFF', 'ac': 'OFF', 'fan': 'OFF', 'recommendation': 'Off', 'reasoning': 'Empty', 'energy_mode': 'eco' },
        ('cool', 1): { 'lights': 'DIM (50%)', 'ac': 'OFF', 'fan': 'OFF', 'recommendation': 'Winter Trace Mode', 'reasoning': 'Cool weather ({temp}). Lights only.', 'energy_mode': 'eco' },
        ('cool', 2): { 'lights': 'ON', 'ac': 'OFF', 'fan': 'OFF', 'recommendation': 'Winter Mode', 'reasoning': 'Cool weather. All cooling systems off.', 'energy_mode': 'eco' },
        ('cool', 3): { 'lights': 'ON', 'ac': 'OFF', 'fan': 'OFF', 'recommendation': 'Winter Mode', 'reasoning': 'Cool weather. Cooling systems unnecessary.', 'energy_mode': 'eco' },
        ('cool', 4): { 'lights': 'ON', 'ac': 'OFF', 'fan': 'LOW', 'recommendation': 'High Capacity — Circulation', 'reasoning': 'Cool weather ({temp}). Fans on low for air circulation only.', 'energy_mode': 'balanced' },
    }
    
    key = (climate_mode, int(occupancy_level))
    override = matrix.get(key, matrix.get(('moderate', int(occupancy_level))))
    
    # Final Seasonal Lock Safety Check
    if is_winter and override['ac'] != 'OFF':
        override['ac'] = 'OFF'
        override['recommendation'] += " (AC Locked by Winter Protocol)"
        override['reasoning'] = "Winter protection active. All cooling units disabled regardless of occupancy."

    return override
