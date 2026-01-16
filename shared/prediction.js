// Disruption Prediction Engine
// Uses weather data + historical patterns to predict delay risk

const PREDICTION_CONFIG = {
    // NYC coordinates for weather
    latitude: 40.7128,
    longitude: -74.0060,

    // Weather API (Open-Meteo - free, no key needed)
    weatherApiUrl: 'https://api.open-meteo.com/v1/forecast',

    // Risk weights (0-1 scale, combined for final score)
    weights: {
        weather: 0.35,
        dayOfWeek: 0.20,
        timeOfDay: 0.15,
        seasonal: 0.15,
        lineBaseline: 0.15
    }
};

// Historical baseline risk by line (0-100, based on typical performance)
const LINE_BASELINES = {
    // LIRR
    'Port Washington': 35,
    'Oyster Bay': 30,
    'Ronkonkoma': 45,
    'Montauk': 50,
    'Long Beach': 40,
    'Hempstead': 38,
    'Babylon': 48,
    'Far Rockaway': 35,
    'West Hempstead': 32,
    'City Terminal Zone': 55,

    // NJ Transit
    'Northeast Corridor': 50,
    'North Jersey Coast': 42,
    'Raritan Valley': 45,
    'Morris & Essex': 40,
    'Main/Bergen': 38,
    'Montclair-Boonton': 40,
    'Pascack Valley': 35,
    'Port Jervis': 48,
    'Atlantic City': 38,
    'Gladstone Branch': 32,
    'Morristown Line': 42,
    'Princeton Branch': 28,

    // Metro-North
    'Hudson Line': 35,
    'Harlem Line': 33,
    'New Haven Line': 42,
    'New Canaan Branch': 30,
    'Danbury Branch': 32,
    'Waterbury Branch': 35,
    'Wassaic Branch': 38
};

// Day of week risk multipliers (0 = Sunday)
const DAY_RISK = {
    0: 0.6,  // Sunday - low service
    1: 1.1,  // Monday - back to work
    2: 1.0,  // Tuesday - normal
    3: 1.0,  // Wednesday - normal
    4: 1.0,  // Thursday - normal
    5: 1.15, // Friday - high volume
    6: 0.7   // Saturday - low service
};

// Time of day risk (24-hour)
function getTimeRisk(hour) {
    if (hour >= 7 && hour <= 9) return 1.3;   // Morning rush
    if (hour >= 17 && hour <= 19) return 1.35; // Evening rush
    if (hour >= 10 && hour <= 16) return 0.9;  // Midday
    if (hour >= 20 || hour <= 5) return 0.7;   // Night
    return 1.0;
}

// Seasonal risk factors
function getSeasonalRisk(month, lineType = 'general') {
    // Leaf season (Oct-Nov) - especially bad for Metro-North
    if (month >= 9 && month <= 10) {
        return lineType === 'mnr' ? 1.3 : 1.1;
    }
    // Winter (Dec-Feb) - snow/ice risks
    if (month === 11 || month === 0 || month === 1) {
        return 1.25;
    }
    // Summer (Jun-Aug) - beach traffic + heat
    if (month >= 5 && month <= 7) {
        return 1.1;
    }
    return 1.0;
}

// Weather risk calculation
function calculateWeatherRisk(weather) {
    let risk = 30; // Base weather risk

    if (!weather) return risk;

    // Temperature extremes
    const temp = weather.temperature;
    if (temp !== undefined) {
        if (temp < 20) risk += 25;        // Very cold - equipment issues
        else if (temp < 32) risk += 15;   // Freezing
        else if (temp > 95) risk += 20;   // Extreme heat - rail expansion
        else if (temp > 85) risk += 10;   // Hot
    }

    // Precipitation
    const precip = weather.precipitation || 0;
    if (precip > 0.5) risk += 30;         // Heavy rain/snow
    else if (precip > 0.1) risk += 15;    // Light precipitation
    else if (precip > 0) risk += 8;       // Trace

    // Wind
    const wind = weather.windSpeed || 0;
    if (wind > 40) risk += 25;            // High wind - tree/debris risk
    else if (wind > 25) risk += 12;
    else if (wind > 15) risk += 5;

    // Snow specifically
    const snow = weather.snowfall || 0;
    if (snow > 4) risk += 40;             // Heavy snow
    else if (snow > 1) risk += 25;        // Moderate snow
    else if (snow > 0) risk += 15;        // Light snow

    // Rain
    const rain = weather.rain || 0;
    if (rain > 0.5) risk += 20;
    else if (rain > 0.1) risk += 10;

    return Math.min(100, risk);
}

// Fetch weather data from Open-Meteo
async function fetchWeather() {
    try {
        const params = new URLSearchParams({
            latitude: PREDICTION_CONFIG.latitude,
            longitude: PREDICTION_CONFIG.longitude,
            current: 'temperature_2m,precipitation,rain,snowfall,wind_speed_10m,weather_code',
            hourly: 'temperature_2m,precipitation_probability,precipitation,rain,snowfall,wind_speed_10m',
            forecast_days: 1,
            timezone: 'America/New_York'
        });

        const response = await fetch(`${PREDICTION_CONFIG.weatherApiUrl}?${params}`);
        if (!response.ok) throw new Error('Weather API failed');

        const data = await response.json();

        // Extract current conditions
        const current = data.current || {};
        const weather = {
            temperature: current.temperature_2m,
            precipitation: current.precipitation,
            rain: current.rain,
            snowfall: current.snowfall,
            windSpeed: current.wind_speed_10m,
            weatherCode: current.weather_code,
            hourly: data.hourly
        };

        return weather;
    } catch (error) {
        console.log('Weather fetch failed:', error.message);
        return null;
    }
}

// Get weather description from WMO code
function getWeatherDescription(code) {
    const descriptions = {
        0: 'Clear sky',
        1: 'Mainly clear',
        2: 'Partly cloudy',
        3: 'Overcast',
        45: 'Foggy',
        48: 'Depositing rime fog',
        51: 'Light drizzle',
        53: 'Moderate drizzle',
        55: 'Dense drizzle',
        61: 'Slight rain',
        63: 'Moderate rain',
        65: 'Heavy rain',
        66: 'Freezing rain (light)',
        67: 'Freezing rain (heavy)',
        71: 'Slight snow',
        73: 'Moderate snow',
        75: 'Heavy snow',
        77: 'Snow grains',
        80: 'Slight rain showers',
        81: 'Moderate rain showers',
        82: 'Violent rain showers',
        85: 'Slight snow showers',
        86: 'Heavy snow showers',
        95: 'Thunderstorm',
        96: 'Thunderstorm with slight hail',
        99: 'Thunderstorm with heavy hail'
    };
    return descriptions[code] || 'Unknown';
}

// Get weather emoji
function getWeatherEmoji(code) {
    if (code === 0 || code === 1) return '☀️';
    if (code === 2 || code === 3) return '⛅';
    if (code >= 45 && code <= 48) return '🌫️';
    if (code >= 51 && code <= 55) return '🌧️';
    if (code >= 61 && code <= 67) return '🌧️';
    if (code >= 71 && code <= 77) return '❄️';
    if (code >= 80 && code <= 82) return '🌦️';
    if (code >= 85 && code <= 86) return '🌨️';
    if (code >= 95) return '⛈️';
    return '🌡️';
}

// Calculate disruption risk for a specific line
function calculateDisruptionRisk(lineName, weather, lineType = 'lirr') {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const hour = now.getHours();
    const month = now.getMonth();

    // Get individual risk components
    const weatherRisk = calculateWeatherRisk(weather);
    const dayRisk = (DAY_RISK[dayOfWeek] || 1.0) * 50;
    const timeRisk = getTimeRisk(hour) * 40;
    const seasonalRisk = getSeasonalRisk(month, lineType) * 35;
    const baselineRisk = LINE_BASELINES[lineName] || 40;

    // Weighted combination
    const weights = PREDICTION_CONFIG.weights;
    const combinedRisk = Math.round(
        weatherRisk * weights.weather +
        dayRisk * weights.dayOfWeek +
        timeRisk * weights.timeOfDay +
        seasonalRisk * weights.seasonal +
        baselineRisk * weights.lineBaseline
    );

    // Normalize to 0-100
    const finalRisk = Math.min(100, Math.max(0, combinedRisk));

    return {
        overall: finalRisk,
        factors: {
            weather: Math.round(weatherRisk),
            dayOfWeek: Math.round(dayRisk),
            timeOfDay: Math.round(timeRisk),
            seasonal: Math.round(seasonalRisk),
            baseline: baselineRisk
        },
        riskLevel: getRiskLevel(finalRisk),
        recommendation: getRecommendation(finalRisk)
    };
}

// Get risk level label
function getRiskLevel(risk) {
    if (risk >= 70) return { label: 'High Risk', color: '#dc3545', emoji: '🔴' };
    if (risk >= 50) return { label: 'Moderate Risk', color: '#fd7e14', emoji: '🟠' };
    if (risk >= 35) return { label: 'Low Risk', color: '#ffc107', emoji: '🟡' };
    return { label: 'Minimal Risk', color: '#28a745', emoji: '🟢' };
}

// Get recommendation based on risk
function getRecommendation(risk) {
    if (risk >= 70) {
        const tips = [
            'Consider alternative transportation today',
            'Build in extra buffer time (30+ mins)',
            'Check real-time alerts before leaving',
            'Have a backup plan ready'
        ];
        return tips[Math.floor(Math.random() * tips.length)];
    }
    if (risk >= 50) {
        const tips = [
            'Allow 15-20 extra minutes',
            'Keep an eye on service alerts',
            'Delays are likely during rush hour',
            'Consider off-peak travel if possible'
        ];
        return tips[Math.floor(Math.random() * tips.length)];
    }
    if (risk >= 35) {
        const tips = [
            'Normal delays possible',
            'Standard buffer time should be fine',
            'Conditions look manageable',
            'Minor delays may occur'
        ];
        return tips[Math.floor(Math.random() * tips.length)];
    }
    const tips = [
        'Looking good for your commute!',
        'Conditions are favorable today',
        'Low chance of significant delays',
        'Smooth sailing expected'
    ];
    return tips[Math.floor(Math.random() * tips.length)];
}

// Format temperature with unit
function formatTemp(temp) {
    if (temp === undefined) return '--°F';
    // Convert Celsius to Fahrenheit
    const fahrenheit = Math.round((temp * 9/5) + 32);
    return `${fahrenheit}°F`;
}

// Main prediction function
async function getPrediction(lineName, lineType = 'lirr') {
    const weather = await fetchWeather();
    const prediction = calculateDisruptionRisk(lineName, weather, lineType);

    return {
        ...prediction,
        weather: weather ? {
            temperature: formatTemp(weather.temperature),
            description: getWeatherDescription(weather.weatherCode),
            emoji: getWeatherEmoji(weather.weatherCode),
            windSpeed: weather.windSpeed ? `${Math.round(weather.windSpeed)} mph` : null,
            precipitation: weather.precipitation
        } : null,
        timestamp: new Date().toISOString(),
        line: lineName
    };
}

// Export for use in other files
window.DisruptionPredictor = {
    getPrediction,
    fetchWeather,
    calculateDisruptionRisk,
    LINE_BASELINES
};
