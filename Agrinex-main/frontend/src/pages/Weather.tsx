import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Micro Weather Forecasting Page - Mock Data Only
 * 
 * This component displays weather forecasting with mock/hardcoded data.
 * No backend API integration at this time.
 */

const Weather: React.FC = () => {
  const { user, selectFarm, getSelectedFarm, getSelectedFarmZoneLocks } = useAuth();
  const [forecastDays, setForecastDays] = useState(7);
  const [loading, setLoading] = useState(false);
  const selectedFarm = getSelectedFarm() || (user?.farms && user.farms.length > 0 ? user.farms[0] : null);
  const hasMultipleFarms = (user?.farms.length || 0) > 1;
  const userFarm = selectedFarm || {
    id: 'farm_123',
    name: 'My Farm',
    location: 'Punjab, India',
    coordinates: '30.7333°N, 76.7794°E',
    area: 100,
  };
  const [currentWeather, setCurrentWeather] = useState<any>({
    location: userFarm.location,
    coordinates: userFarm.coordinates,
    temperature: 24,
    feelsLike: 35,
    condition: 'Sunny',
    humidity: 65,
    windSpeed: 12,
    windDirection: 'NW',
    pressure: 1013,
    visibility: 10,
    uvIndex: 7,
    sunrise: '6:45 AM',
    sunset: '6:12 PM',
    lastUpdated: '2 minutes ago',
  });
  const [forecastData, setForecastData] = useState<any[]>(
    Array.from({ length: forecastDays }, (_, i) => ({
      date: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
      high: 24 + Math.floor(Math.random() * 5),
      low: 16 + Math.floor(Math.random() * 5),
      condition: ['Sunny', 'Partly Cloudy', 'Cloudy', 'Rainy'][Math.floor(Math.random() * 4)],
      rainChance: Math.floor(Math.random() * 100),
      rainAmount: Math.floor(Math.random() * 25),
      humidity: 50 + Math.floor(Math.random() * 30),
      windSpeed: 8 + Math.floor(Math.random() * 10),
    }))
  );
  const [analytics, setAnalytics] = useState<{ avgTemp: number; maxTemp: number; minTemp: number; totalRainfall: number; avgHumidity: number; avgWindSpeed: number; extremeDays: number }>({
    avgTemp: 28,
    maxTemp: 38,
    minTemp: 22,
    totalRainfall: 45,
    avgHumidity: 68,
    avgWindSpeed: 11,
    extremeDays: 2,
  });
  const [gemini, setGemini] = useState<any | null>(null);
  const zoneLocks = getSelectedFarmZoneLocks();

  // No useEffect hooks - using mock data only

  

  // TODO: Replace with API call - Micro Weather Forecasting (Multi-Radius Zones)
  // 
  // BACKEND INTEGRATION GUIDE:
  // 
  // 1. Fetch Micro Weather Data:
  //    GET /api/weather/micro-forecast?farmId={userFarm.id}&radius=2,10,20
  //    OR: GET /api/weather/micro-forecast?lat={lat}&lon={lon}&radius=2,10,20
  //    
  //    Backend should:
  //    - Extract farm coordinates from userFarm.coordinates
  //    - Call OpenWeather API (or similar) for each radius zone
  //    - Use OpenWeather's "One Call API 3.0" with lat/lon to get hyperlocal data
  //    - For each radius (2km, 10km, 20km), fetch weather data for that area
  //    - Return current weather + forecast for each zone
  //
  // 2. Gemini API Integration for Predictions:
  //    POST /api/weather/gemini-micro-predictions
  //    Payload: {
  //      farmId: string,
  //      zones: [
  //        {
  //          radius: 2,
  //          currentWeather: {...},
  //          forecast: [...],
  //          soilData: {...}, // From soil sensors
  //          cropData: {...}, // Current crop info
  //        },
  //        // ... 10km, 20km zones
  //      ]
  //    }
  //
  //    Gemini Prompt Example:
  //    "Analyze micro weather data for agriculture across 3 radius zones (2km, 10km, 20km) 
  //     around farm coordinates. For each zone, predict:
  //     1. Rainfall probability (next 24h, 48h, 7 days) with confidence level
  //     2. Soil quality degradation risk (LOW/MODERATE/HIGH) with probability and factors
  //     3. Other critical insights for farmers (temperature patterns, wind effects, etc.)
  //     
  //     Consider: current weather, forecast trends, soil conditions, crop type, 
  //     and microclimate patterns. Provide actionable recommendations."
  //
  //    Response Structure:
  //    {
  //      zones: [
  //        {
  //          radius: 2,
  //          rainfallChance: { next24h: 15, next48h: 35, next7days: 60, confidence: 82, analysis: "..." },
  //          soilDegradationRisk: { risk: "LOW", probability: 12, factors: [...], timeframe: "...", recommendation: "..." },
  //          otherInsights: [...]
  //        },
  //        // ... other zones
  //      ]
  //    }
  //
  // 3. Real-Time Updates:
  //    - Poll every 5-10 minutes: useEffect(() => { fetchMicroWeather(); const interval = setInterval(fetchMicroWeather, 300000); return () => clearInterval(interval); }, [selectedFarm?.id]);
  //    - Re-run Gemini predictions when weather data changes significantly
  //    - Cache predictions for 15-30 minutes to reduce API calls
  //
  // 4. OpenWeather API Integration:
  //    - Use "One Call API 3.0" for hyperlocal forecasts
  //    - For multi-radius: Calculate lat/lon points at 2km, 10km, 20km distances
  //    - Use geospatial queries or multiple API calls for each radius
  //    - Alternative: Use OpenWeather's "Grid" API if available for your region
  //
  const microWeatherZones = React.useMemo(() => {
    if (!currentWeather) return [];
    const baseCurrent = {
      temperature: currentWeather.temperature,
      humidity: currentWeather.humidity,
      windSpeed: currentWeather.windSpeed,
      condition: currentWeather.condition,
      pressure: currentWeather.pressure,
    };
    const fc = forecastData.slice(0, 7);
    return [
      {
        radius: 2,
        label: 'Immediate Zone (2km)',
        description: 'Weather conditions directly affecting your farm',
        current: baseCurrent,
        forecast: fc,
        geminiPredictions: {
          rainfallChance: {
            next24h: 15,
            next48h: 35,
            next7days: 60,
            confidence: 82,
            analysis: 'Low rainfall probability in immediate zone. Dry conditions expected.',
          },
          soilDegradationRisk: {
            risk: 'LOW',
            probability: 12,
            factors: ['Low humidity may cause soil moisture loss', 'No significant weather events expected'],
            timeframe: 'Next 7 days',
            recommendation: 'Monitor soil moisture levels. Consider light irrigation if soil becomes too dry.',
          },
          otherInsights: [
            'Temperature stable - optimal for crop growth',
            'Wind speed moderate - no damage risk',
            'Pressure stable - no storm systems approaching',
          ],
        },
      },
      {
        radius: 10,
        label: 'Regional Zone (10km)',
        description: 'Weather patterns in your surrounding region',
        current: baseCurrent,
        forecast: fc,
        geminiPredictions: {
          rainfallChance: {
            next24h: 25,
            next48h: 45,
            next7days: 70,
            confidence: 78,
            analysis: 'Moderate rainfall probability in regional zone. Some areas may receive light showers.',
          },
          soilDegradationRisk: {
            risk: 'MODERATE',
            probability: 28,
            factors: ['Variable humidity patterns', 'Possible light rainfall may affect soil moisture'],
            timeframe: 'Next 5-7 days',
            recommendation: 'Prepare for variable weather. Adjust irrigation schedule based on regional patterns.',
          },
          otherInsights: [
            'Regional temperature slightly cooler - may affect microclimate',
            'Higher wind speeds detected - monitor for potential crop damage',
            'Cloud cover increasing - may reduce solar radiation',
          ],
        },
      },
      {
        radius: 20,
        label: 'Extended Zone (20km)',
        description: 'Broader weather systems affecting your area',
        current: baseCurrent,
        forecast: fc,
        geminiPredictions: {
          rainfallChance: {
            next24h: 35,
            next48h: 55,
            next7days: 80,
            confidence: 75,
            analysis: 'Higher rainfall probability in extended zone. Weather system approaching from west.',
          },
          soilDegradationRisk: {
            risk: 'MODERATE',
            probability: 35,
            factors: ['Approaching weather system may bring heavy rain', 'Increased humidity may affect soil aeration'],
            timeframe: 'Next 3-5 days',
            recommendation: 'Prepare for potential heavy rainfall. Ensure proper drainage. Monitor soil conditions closely.',
          },
          otherInsights: [
            'Weather system approaching from extended zone',
            'Pressure dropping - indicates incoming weather change',
            'Temperature gradient detected - may bring cooler conditions',
            'Increased cloud cover in extended zone may reach your farm',
          ],
        },
      },
    ];
  }, [currentWeather, forecastData]);

  

  const GeminiCard = () => {
    if (!gemini) return null;
    return (
      <div className="card-apple" style={{ padding: 'var(--space-lg)', marginTop: 'var(--space-lg)' }}>
        <div style={{ fontSize: 'var(--body)', color: 'var(--text-tertiary)', marginBottom: 'var(--space-xs)' }}>
          AI Insights
        </div>
        <GeminiCard />
        <div style={{ fontSize: 'var(--body-lg)', color: 'var(--text-primary)' }}>
          {gemini.summary?.text || 'No insights'}
        </div>
      </div>
    );
  };
  // TODO: Replace with Gemini API integration
  // Backend endpoint: POST /api/weather/gemini-insights
  // Payload: { farmId, forecastData, currentWeather, soilData, cropData }
  // Gemini will generate: cultivation action plan, risk alerts, best practices
  // 
  // Example backend implementation:
  // const geminiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //     'x-goog-api-key': process.env.GEMINI_API_KEY
  //   },
  //   body: JSON.stringify({
  //     contents: [{
  //       parts: [{
  //         text: `Analyze this weather data for agriculture: ${JSON.stringify({forecastData, currentWeather})} 
  //         Generate: 1) Cultivation action plan, 2) Risk alerts, 3) Best practices`
  //       }]
  //     }]
  //   })
  // });

  // TODO: Replace with real-time ML model insights + Gemini API
  // These will update automatically as weather data changes
  // Backend will combine ML model predictions with Gemini AI analysis
  const mlInsights = {
    lastUpdated: new Date().toLocaleTimeString(),
    irrigationRecommendation: {
      action: 'IRRIGATE_NOW',
      confidence: 87,
      reason: 'Soil moisture below threshold (32%) and no rain expected for 5 days',
      optimalTime: 'Tomorrow 6:00 AM - 7:00 AM',
      duration: '45 minutes',
      waterVolume: '2,850 liters',
      expectedBenefit: 'Prevent 12% yield loss (₹3,600 saved)',
      riskIfDelayed: 'Crop stress may reduce yield by 15-20%',
    },
    irrigationTiming: {
      // ML Model + Gemini AI generated irrigation schedule
      schedule: [
        {
          day: 1,
          date: forecastData[0].date.toLocaleDateString(),
          optimalTime: '6:00 AM - 7:00 AM',
          duration: '45 minutes',
          waterVolume: '2,850 liters',
          reason: 'Soil moisture below threshold (32%) and no rain expected',
          priority: 'HIGH',
          confidence: 87,
        },
        {
          day: 4,
          date: forecastData[3].date.toLocaleDateString(),
          optimalTime: '5:30 AM - 6:30 AM',
          duration: '40 minutes',
          waterVolume: '2,500 liters',
          reason: 'Maintain optimal moisture before dry period',
          priority: 'MEDIUM',
          confidence: 72,
        },
        {
          day: 7,
          date: forecastData[6].date.toLocaleDateString(),
          optimalTime: '6:00 AM - 7:00 AM',
          duration: '50 minutes',
          waterVolume: '3,200 liters',
          reason: 'Prevent stress during high temperature period',
          priority: 'HIGH',
          confidence: 81,
        },
      ],
      totalWaterNeeded: '8,550 liters',
      estimatedCost: '₹142',
      waterEfficiency: '28% better than traditional scheduling',
      expectedYieldBenefit: '+12% yield improvement',
    },
    // TODO: Generated by Gemini API - simple, actionable best practices for farmers
    bestPractices: [
      {
        practice: 'Irrigate Early Morning',
        tip: 'Water between 5:30 AM - 7:00 AM to save water',
        benefit: 'Save ₹8,200 this season',
      },
      {
        practice: 'Use Mulch',
        tip: 'Apply 2-3 inches of organic mulch to keep soil moist',
        benefit: 'Reduce watering by 30%',
      },
      {
        practice: 'Monitor Soil Moisture',
        tip: 'Check soil before watering to avoid over-irrigation',
        benefit: 'Better crop health',
      },
    ],
  };

  return (
    <section className="section" style={{ paddingTop: 'var(--space-xl)' }}>
      <div className="container">
        {/* Header */}
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
            <div className="pill" style={{ background: 'rgba(16, 185, 129, 0.15)', borderColor: 'var(--green-primary)', color: 'var(--green-light)' }}>
              🌤️ Micro Weather Forecasting
            </div>
          </div>
          <h1 style={{ fontSize: 'var(--h1)', marginBottom: 'var(--space-md)', color: 'var(--text-primary)' }}>
            Hyper-Local Weather Intelligence
          </h1>
          <div className="card-apple" style={{ marginTop: 'var(--space-md)', background: 'rgba(16, 185, 129, 0.08)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-md)', alignItems: 'start' }}>
              <div>
                <div className="pill" style={{ marginBottom: 'var(--space-sm)', background: 'rgba(16, 185, 129, 0.15)', borderColor: 'var(--green-primary)', color: 'var(--green-light)' }}>📊 Mock Weather Data</div>
                <div style={{ fontSize: 'var(--body)', color: 'var(--text-secondary)' }}>
                  This page displays sample weather data. API integration is not enabled.
                </div>
              </div>
            </div>
          </div>
          <p style={{ fontSize: 'var(--body-lg)', color: 'var(--text-secondary)', maxWidth: 'var(--narrow-width)', marginBottom: 'var(--space-sm)' }}>
            Get farm-specific weather predictions for your exact location. Not generic regional forecasts — precise micro-weather data designed for agriculture decision-making.
          </p>
          <div style={{ 
            padding: 'var(--space-sm) var(--space-md)', 
            background: 'rgba(16, 185, 129, 0.1)', 
            borderRadius: 'var(--space-xs)',
            border: '1px solid var(--green-primary)',
            display: 'inline-block',
            marginTop: 'var(--space-sm)',
          }}>
            <div style={{ fontSize: 'var(--body)', color: 'var(--text-primary)', fontWeight: 500 }}>
              ✨ <strong>Innovative Feature:</strong> Multi-radius micro weather forecasting (2km, 10km, 20km) with AI-powered predictions
            </div>
          </div>
        </div>

        {/* User Farm Info & Forecast Period Selector */}
        <div className="card-apple" style={{ marginBottom: 'var(--space-lg)' }}>
          <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
            {/* Farm Selector (if multiple farms) */}
            {hasMultipleFarms && (
              <div>
                <label style={{ fontSize: 'var(--body)', color: 'var(--text-tertiary)', marginBottom: 'var(--space-xs)', display: 'block' }}>
                  Select Farm
                </label>
                <select
                  value={selectedFarm?.id || ''}
                  onChange={(e) => selectFarm(e.target.value)}
                  style={{
                    padding: 'var(--space-sm) var(--space-md)',
                    borderRadius: 'var(--space-xs)',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    fontSize: 'var(--body)',
                    width: '100%',
                    maxWidth: '400px',
                  }}
                >
                  {user?.farms.map((farm) => (
                    <option key={farm.id} value={farm.id}>
                      {farm.name} - {farm.location}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
              <div>
                <div style={{ fontSize: 'var(--body)', color: 'var(--text-tertiary)', marginBottom: 'var(--space-xs)' }}>
                  {hasMultipleFarms ? 'Selected Farm' : 'Your Farm Location'}
                </div>
                <div style={{ fontSize: 'var(--h3)', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {userFarm.name}
                </div>
                <div style={{ fontSize: 'var(--body)', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {userFarm.location} · {userFarm.coordinates}
                </div>
                {userFarm.area && userFarm.area > 0 && (
                  <div style={{ fontSize: 'var(--body)', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                    Area: {userFarm.area} acres
                  </div>
                )}
              </div>
              <div>
                <label style={{ fontSize: 'var(--body)', color: 'var(--text-tertiary)', marginBottom: 'var(--space-xs)', display: 'block' }}>
                  Forecast Period
                </label>
                <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                  {[7, 14].map((days) => (
                    <button
                      key={days}
                      onClick={() => setForecastDays(days)}
                      className={forecastDays === days ? 'btn btn-primary' : 'btn btn-secondary'}
                      style={{ padding: 'var(--space-xs) var(--space-md)', fontSize: 'var(--body)' }}
                    >
                      {days} Days
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Current Weather */}
        <div className="card-apple" style={{ marginBottom: 'var(--space-lg)' }}>
          <div className="pill" style={{ marginBottom: 'var(--space-md)' }}>Current Conditions</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-xl)', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 'var(--body)', color: 'var(--text-tertiary)', marginBottom: 'var(--space-xs)' }}>
                {currentWeather.location}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: 'var(--space-md)' }}>
                {currentWeather.coordinates} · Updated {currentWeather.lastUpdated}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
                <div style={{ fontSize: 'var(--h1)', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {currentWeather.temperature}°
                </div>
                <div style={{ fontSize: 'var(--h3)', color: 'var(--text-tertiary)' }}>C</div>
                <div style={{ fontSize: 'var(--body-lg)', color: 'var(--text-secondary)', marginLeft: 'var(--space-sm)' }}>
                  {currentWeather.condition}
                </div>
              </div>
              <div style={{ fontSize: 'var(--body)', color: 'var(--text-tertiary)' }}>
                Feels like {currentWeather.feelsLike}°C
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-md)' }}>
              <WeatherMetric icon="💧" label="Humidity" value={`${currentWeather.humidity}%`} />
              <WeatherMetric icon="💨" label="Wind" value={`${currentWeather.windSpeed} km/h ${currentWeather.windDirection}`} />
              <WeatherMetric icon="📊" label="Pressure" value={`${currentWeather.pressure} hPa`} />
              <WeatherMetric icon="☀️" label="UV Index" value={currentWeather.uvIndex} />
              <WeatherMetric icon="🌅" label="Sunrise" value={currentWeather.sunrise} />
              <WeatherMetric icon="🌇" label="Sunset" value={currentWeather.sunset} />
            </div>
          </div>
        </div>

        {/* Zone Irrigation Plan - Placeholder (no zones from API) */}


        {/* Micro Weather Forecasting - Multi-Radius Zones */}
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
            <div className="pill" style={{ background: 'rgba(16, 185, 129, 0.15)', borderColor: 'var(--green-primary)', color: 'var(--green-light)' }}>
              🎯 Micro Weather Zones
            </div>
          </div>
          <h2 style={{ fontSize: 'var(--h1)', marginBottom: 'var(--space-sm)', color: 'var(--text-primary)' }}>
            Multi-Radius Weather Analysis
          </h2>
          <p style={{ fontSize: 'var(--body-lg)', color: 'var(--text-secondary)', maxWidth: 'var(--narrow-width)', marginBottom: 'var(--space-lg)' }}>
            Unique micro weather forecasting: Get weather predictions for 2km, 10km, and 20km radius zones around your farm. Gemini AI analyzes patterns to predict rainfall chances, soil quality risks, and other critical factors.
          </p>

          <div style={{ display: 'grid', gap: 'var(--space-lg)' }}>
            {microWeatherZones.map((zone) => (
              <MicroWeatherZoneCard key={zone.radius} zone={zone} />
            ))}
          </div>
        </div>

        {/* Forecast Grid */}
        <div style={{ marginBottom: 'var(--space-lg)' }}>
          <div className="pill" style={{ marginBottom: 'var(--space-md)' }}>{forecastDays}-Day Forecast</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--space-md)' }}>
            {forecastData.map((day, i) => (
              <ForecastDay key={i} day={day} isToday={i === 0} />
            ))}
          </div>
        </div>

        {/* Analytics Section */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
          <AnalyticsCard
            title="Temperature Analysis"
            icon="🌡️"
            metrics={[
              { label: 'Average', value: `${analytics.avgTemp}°C`, color: 'var(--text-primary)' },
              { label: 'Maximum', value: `${analytics.maxTemp}°C`, color: 'var(--green-light)' },
              { label: 'Minimum', value: `${analytics.minTemp}°C`, color: 'var(--text-tertiary)' },
            ]}
          />
          <AnalyticsCard
            title="Rainfall Summary"
            icon="🌧️"
            metrics={[
              { label: 'Total Expected', value: `${analytics.totalRainfall} mm`, color: 'var(--text-primary)' },
              { label: 'Rainy Days', value: `${forecastData.filter(d => d.rainChance > 50).length} days`, color: 'var(--green-light)' },
              { label: 'Peak Day', value: `${Math.max(...forecastData.map(d => d.rainAmount))} mm`, color: 'var(--text-tertiary)' },
            ]}
          />
          <AnalyticsCard
            title="Environmental Factors"
            icon="🌍"
            metrics={[
              { label: 'Avg Humidity', value: `${analytics.avgHumidity}%`, color: 'var(--text-primary)' },
              { label: 'Avg Wind Speed', value: `${analytics.avgWindSpeed} km/h`, color: 'var(--green-light)' },
              { label: 'Extreme Days', value: `${analytics.extremeDays} days`, color: 'var(--text-tertiary)' },
            ]}
          />
        </div>

        {/* Irrigation Timing Recommendations - ML Model Generated */}
        {zoneLocks.length === 0 && (
        <div className="card-apple">
          <div className="pill" style={{ marginBottom: 'var(--space-md)' }}>💧 Irrigation Timing Schedule (ML + AI Optimized)</div>
          <p style={{ fontSize: 'var(--body)', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
            AI-powered irrigation schedule based on {forecastDays}-day weather forecast, soil moisture, and crop requirements:
          </p>
          <div style={{ display: 'grid', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
            {mlInsights.irrigationTiming.schedule.map((schedule, i) => (
              <div
                key={i}
                style={{
                  padding: 'var(--space-md)',
                  background: schedule.priority === 'HIGH' ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-tertiary)',
                  borderRadius: 'var(--space-xs)',
                  border: `2px solid ${schedule.priority === 'HIGH' ? 'var(--green-primary)' : 'var(--border-color)'}`,
                  borderLeft: `4px solid ${schedule.priority === 'HIGH' ? 'var(--green-primary)' : 'var(--green-light)'}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-sm)', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Day {schedule.day} · {schedule.date}</div>
                    <div style={{ fontSize: 'var(--h3)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                      {schedule.optimalTime}
                    </div>
                    <div style={{ fontSize: 'var(--body)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      {schedule.reason}
                    </div>
                  </div>
                  <div style={{ 
                    padding: '4px 8px', 
                    borderRadius: '4px',
                    background: schedule.priority === 'HIGH' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.08)',
                    color: 'var(--green-light)',
                    fontSize: '11px',
                    fontWeight: 600,
                  }}>
                    {schedule.priority} PRIORITY
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>Duration</div>
                    <div style={{ fontSize: 'var(--body)', fontWeight: 600, color: 'var(--text-primary)' }}>{schedule.duration}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>Water Volume</div>
                    <div style={{ fontSize: 'var(--body)', fontWeight: 600, color: 'var(--text-primary)' }}>{schedule.waterVolume}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>Confidence</div>
                    <div style={{ fontSize: 'var(--body)', fontWeight: 600, color: 'var(--green-light)' }}>{schedule.confidence}%</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ 
            padding: 'var(--space-md)', 
            background: 'rgba(16, 185, 129, 0.1)', 
            borderRadius: 'var(--space-xs)',
            border: '1px solid var(--green-primary)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 'var(--space-md)'
          }}>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Total Water Needed</div>
              <div style={{ fontSize: 'var(--h3)', fontWeight: 600, color: 'var(--green-primary)' }}>{mlInsights.irrigationTiming.totalWaterNeeded}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Estimated Cost</div>
              <div style={{ fontSize: 'var(--h3)', fontWeight: 600, color: 'var(--text-primary)' }}>{mlInsights.irrigationTiming.estimatedCost}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Water Efficiency</div>
              <div style={{ fontSize: 'var(--body)', fontWeight: 600, color: 'var(--green-light)' }}>{mlInsights.irrigationTiming.waterEfficiency}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Expected Benefit</div>
              <div style={{ fontSize: 'var(--body)', fontWeight: 600, color: 'var(--green-light)' }}>{mlInsights.irrigationTiming.expectedYieldBenefit}</div>
            </div>
          </div>
        </div>
        )}

        {/* Temperature Chart */}
        <div className="card-apple" style={{ marginTop: 'var(--space-lg)' }}>
          <div className="pill" style={{ marginBottom: 'var(--space-md)' }}>Temperature Trend</div>
          <TemperatureChart data={forecastData} />
        </div>

        {/* Rainfall Chart */}
        <div className="card-apple" style={{ marginTop: 'var(--space-lg)' }}>
          <div className="pill" style={{ marginBottom: 'var(--space-md)' }}>Rainfall Probability</div>
          <RainfallChart data={forecastData} />
        </div>

        {/* Agriculture Insights */}
        <div className="card-apple" style={{ marginTop: 'var(--space-lg)', background: 'rgba(16, 185, 129, 0.08)', borderColor: 'var(--green-primary)' }}>
          <div className="pill" style={{ marginBottom: 'var(--space-md)', background: 'rgba(16, 185, 129, 0.15)', borderColor: 'var(--green-primary)', color: 'var(--green-light)' }}>
            💡 AI Recommendations
          </div>

          {/* Priority Action - Irrigation Recommendation */}
          <div style={{ 
            padding: 'var(--space-md)', 
            background: mlInsights.irrigationRecommendation.action === 'IRRIGATE_NOW' ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-tertiary)',
            borderRadius: 'var(--space-xs)',
            border: '2px solid var(--green-primary)',
            marginBottom: 'var(--space-lg)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
              <span style={{ fontSize: 'var(--h2)' }}>💧</span>
              <div>
                <div style={{ fontSize: 'var(--h3)', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {mlInsights.irrigationRecommendation.action === 'IRRIGATE_NOW' ? 'IRRIGATE NOW' : 'WAIT - DO NOT IRRIGATE'}
                </div>
                <div style={{ fontSize: 'var(--body)', color: 'var(--text-tertiary)' }}>
                  Confidence: {mlInsights.irrigationRecommendation.confidence}%
                </div>
              </div>
            </div>
            <div style={{ fontSize: 'var(--body)', color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)', lineHeight: 1.6 }}>
              {mlInsights.irrigationRecommendation.reason}
            </div>
            {mlInsights.irrigationRecommendation.action === 'IRRIGATE_NOW' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>Optimal Time</div>
                  <div style={{ fontSize: 'var(--body)', fontWeight: 600, color: 'var(--green-light)' }}>{mlInsights.irrigationRecommendation.optimalTime}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>Duration</div>
                  <div style={{ fontSize: 'var(--body)', fontWeight: 600, color: 'var(--text-primary)' }}>{mlInsights.irrigationRecommendation.duration}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>Water Volume</div>
                  <div style={{ fontSize: 'var(--body)', fontWeight: 600, color: 'var(--text-primary)' }}>{mlInsights.irrigationRecommendation.waterVolume}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>Expected Benefit</div>
                  <div style={{ fontSize: 'var(--body)', fontWeight: 600, color: 'var(--green-light)' }}>{mlInsights.irrigationRecommendation.expectedBenefit}</div>
                </div>
              </div>
            )}
            <div style={{ marginTop: 'var(--space-sm)', padding: 'var(--space-sm)', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--space-xs)', borderLeft: '3px solid #ef4444' }}>
              <div style={{ fontSize: '12px', color: '#ef4444', fontWeight: 600 }}>⚠️ Risk if delayed:</div>
              <div style={{ fontSize: 'var(--body)', color: 'var(--text-secondary)' }}>{mlInsights.irrigationRecommendation.riskIfDelayed}</div>
            </div>
          </div>

          {/* Simple Tips - Minimal for Farmers */}
          <div>
            <h3 style={{ fontSize: 'var(--h3)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-md)' }}>
              💡 Simple Tips
            </h3>
            <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
              {mlInsights.bestPractices.map((practice, i) => (
                <SimpleTipCard key={i} practice={practice} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

interface WeatherMetricProps {
  icon: string;
  label: string;
  value: string | number;
}

const WeatherMetric: React.FC<WeatherMetricProps> = ({ icon, label, value }) => (
  <div>
    <div style={{ fontSize: 'var(--body)', color: 'var(--text-tertiary)', marginBottom: '4px' }}>{icon} {label}</div>
    <div style={{ fontSize: 'var(--h3)', fontWeight: 600, color: 'var(--text-primary)' }}>{value}</div>
  </div>
);

interface ForecastDayProps {
  day: {
    date: Date;
    high: number;
    low: number;
    condition: string;
    rainChance: number;
    rainAmount: number;
    humidity: number;
    windSpeed: number;
  };
  isToday: boolean;
}

const ForecastDay: React.FC<ForecastDayProps> = ({ day, isToday }) => {
  const dayName = isToday ? 'Today' : day.date.toLocaleDateString('en-US', { weekday: 'short' });
  const date = day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div
      className="card-apple"
      style={{
        padding: 'var(--space-md)',
        textAlign: 'center',
        background: isToday ? 'rgba(16, 185, 129, 0.1)' : undefined,
        borderColor: isToday ? 'var(--green-primary)' : undefined,
      }}
    >
      <div style={{ fontSize: 'var(--body)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-xs)' }}>
        {dayName}
      </div>
      <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: 'var(--space-sm)' }}>{date}</div>
      <div style={{ fontSize: 'var(--h2)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px' }}>
        {day.high}°
      </div>
      <div style={{ fontSize: 'var(--body)', color: 'var(--text-tertiary)', marginBottom: 'var(--space-sm)' }}>
        {day.low}°
      </div>
      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: 'var(--space-xs)' }}>{day.condition}</div>
      {day.rainChance > 0 && (
        <div style={{ fontSize: '11px', color: 'var(--green-light)', marginTop: 'var(--space-xs)' }}>
          💧 {day.rainChance}% ({day.rainAmount}mm)
        </div>
      )}
    </div>
  );
};

interface AnalyticsCardProps {
  title: string;
  icon: string;
  metrics: Array<{ label: string; value: string; color: string }>;
}

const AnalyticsCard: React.FC<AnalyticsCardProps> = ({ title, icon, metrics }) => (
  <div className="card-apple">
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
      <span style={{ fontSize: 'var(--h3)' }}>{icon}</span>
      <h3 style={{ fontSize: 'var(--h3)', fontWeight: 600, color: 'var(--text-primary)' }}>{title}</h3>
    </div>
    <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
      {metrics.map((metric, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: i > 0 ? 'var(--space-xs)' : 0, borderTop: i > 0 ? '1px solid var(--border-color)' : 'none' }}>
          <span style={{ fontSize: 'var(--body)', color: 'var(--text-tertiary)' }}>{metric.label}:</span>
          <span style={{ fontSize: 'var(--body)', fontWeight: 600, color: metric.color }}>{metric.value}</span>
        </div>
      ))}
    </div>
  </div>
);

interface TemperatureChartProps {
  data: Array<{ high: number; low: number; date: Date }>;
}

const TemperatureChart: React.FC<TemperatureChartProps> = ({ data }) => {
  const maxTemp = Math.max(...data.map(d => d.high));
  const minTemp = Math.min(...data.map(d => d.low));
  const range = maxTemp - minTemp;
  const chartHeight = 200;
  const chartWidth = 800; // Base width for SVG coordinate system
  const padding = 40;

  // Calculate points for smooth curves
  const getY = (temp: number) => chartHeight - padding - ((temp - minTemp) / range) * (chartHeight - padding * 2);
  const getX = (index: number, total: number) => (index / (total - 1)) * (chartWidth - padding * 2) + padding;

  // Generate smooth curve paths using quadratic bezier curves
  const createSmoothPath = (values: number[], getY: (val: number) => number) => {
    if (values.length === 0) return '';
    
    let path = `M ${getX(0, values.length)} ${getY(values[0])}`;
    
    for (let i = 1; i < values.length; i++) {
      const x1 = getX(i - 1, values.length);
      const y1 = getY(values[i - 1]);
      const x2 = getX(i, values.length);
      const y2 = getY(values[i]);
      
      // Control point for smooth curve
      const cpX = (x1 + x2) / 2;
      const cpY1 = y1;
      const cpY2 = y2;
      
      path += ` Q ${cpX} ${cpY1}, ${(x1 + x2) / 2} ${(y1 + y2) / 2}`;
      path += ` T ${x2} ${y2}`;
    }
    
    return path;
  };

  const highValues = data.map(d => d.high);
  const lowValues = data.map(d => d.low);
  const highPath = createSmoothPath(highValues, getY);
  const lowPath = createSmoothPath(lowValues, getY);

  // Create area path for gradient fill
  const createAreaPath = (values: number[], getY: (val: number) => number) => {
    const path = createSmoothPath(values, getY);
    const lastX = getX(values.length - 1, values.length);
    const firstX = getX(0, values.length);
    return `${path} L ${lastX} ${chartHeight - padding} L ${firstX} ${chartHeight - padding} Z`;
  };

  return (
    <div style={{ width: '100%', margin: 'var(--space-sm) 0' }}>
      <div style={{ position: 'relative', width: '100%', height: `${chartHeight}px` }}>
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: '100%', display: 'block', overflow: 'visible' }}>
          <defs>
            <linearGradient id="tempHighGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="var(--green-light)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="var(--green-primary)" stopOpacity="0.1" />
            </linearGradient>
            <linearGradient id="tempLowGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="var(--green-primary)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="var(--green-dark)" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          
          {/* Area fill for high temps */}
          <path
            d={createAreaPath(highValues, getY)}
            fill="url(#tempHighGradient)"
            style={{ transition: 'all 0.6s ease' }}
          />
          
          {/* Area fill for low temps */}
          <path
            d={createAreaPath(lowValues, getY)}
            fill="url(#tempLowGradient)"
            style={{ transition: 'all 0.6s ease' }}
          />
          
          {/* High temperature curve */}
          <path
            d={highPath}
            fill="none"
            stroke="var(--green-light)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ transition: 'all 0.6s ease' }}
          />
          
          {/* Low temperature curve */}
          <path
            d={lowPath}
            fill="none"
            stroke="var(--green-primary)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ transition: 'all 0.6s ease' }}
          />
          
          {/* Data points */}
          {data.map((day, i) => {
            const x = getX(i, data.length);
            return (
              <g key={i}>
                <circle
                  cx={x}
                  cy={getY(day.high)}
                  r="4"
                  fill="var(--green-light)"
                  stroke="var(--bg-card)"
                  strokeWidth="2"
                  style={{ transition: 'all 0.6s ease' }}
                />
                <circle
                  cx={x}
                  cy={getY(day.low)}
                  r="4"
                  fill="var(--green-primary)"
                  stroke="var(--bg-card)"
                  strokeWidth="2"
                  style={{ transition: 'all 0.6s ease' }}
                />
                {/* Tooltip on hover */}
                <title>{`${day.date.toLocaleDateString()}: High ${day.high}°C, Low ${day.low}°C`}</title>
              </g>
            );
          })}
        </svg>
        
        {/* Temperature labels */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', padding: '0 var(--space-xs)' }}>
          {data.map((day, i) => (
            <div key={i} style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: '10px', color: 'var(--text-primary)', fontWeight: 600, marginBottom: '2px' }}>
                {day.high}°
              </div>
              <div style={{ fontSize: '9px', color: 'var(--text-tertiary)' }}>
                {day.low}°
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Day labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-tertiary)', paddingTop: 'var(--space-md)' }}>
        {data.map((day, i) => (
          <div key={i} style={{ textAlign: 'center', flex: 1 }}>
            {i === 0 ? 'Today' : day.date.toLocaleDateString('en-US', { weekday: 'short' })}
          </div>
        ))}
      </div>
    </div>
  );
};

interface RainfallChartProps {
  data: Array<{ rainChance: number; rainAmount: number; date: Date }>;
}

const RainfallChart: React.FC<RainfallChartProps> = ({ data }) => {
  const maxRain = Math.max(...data.map(d => d.rainAmount), 1);
  const chartHeight = 180;
  const chartWidth = 800; // Base width for SVG coordinate system
  const padding = 40;

  // Calculate points for smooth curves
  const getY = (amount: number) => chartHeight - padding - (amount / maxRain) * (chartHeight - padding * 2);
  const getX = (index: number, total: number) => (index / (total - 1)) * (chartWidth - padding * 2) + padding;

  // Generate smooth curve path
  const createSmoothPath = (values: number[], getY: (val: number) => number) => {
    if (values.length === 0) return '';
    
    let path = `M ${getX(0, values.length)} ${chartHeight - padding}`;
    path += ` L ${getX(0, values.length)} ${getY(values[0])}`;
    
    for (let i = 1; i < values.length; i++) {
      const x1 = getX(i - 1, values.length);
      const y1 = getY(values[i - 1]);
      const x2 = getX(i, values.length);
      const y2 = getY(values[i]);
      
      const cpX = (x1 + x2) / 2;
      path += ` Q ${cpX} ${y1}, ${cpX} ${(y1 + y2) / 2}`;
      path += ` T ${x2} ${y2}`;
    }
    
    // Close the path
    const lastX = getX(values.length - 1, values.length);
    path += ` L ${lastX} ${chartHeight - padding} Z`;
    
    return path;
  };

  const rainAmounts = data.map(d => d.rainAmount);
  const areaPath = createSmoothPath(rainAmounts, getY);

  // Create line path for the curve
  const createLinePath = (values: number[], getY: (val: number) => number) => {
    if (values.length === 0) return '';
    
    let path = `M ${getX(0, values.length)} ${getY(values[0])}`;
    
    for (let i = 1; i < values.length; i++) {
      const x1 = getX(i - 1, values.length);
      const y1 = getY(values[i - 1]);
      const x2 = getX(i, values.length);
      const y2 = getY(values[i]);
      
      const cpX = (x1 + x2) / 2;
      path += ` Q ${cpX} ${y1}, ${cpX} ${(y1 + y2) / 2}`;
      path += ` T ${x2} ${y2}`;
    }
    
    return path;
  };

  const linePath = createLinePath(rainAmounts, getY);

  return (
    <div style={{ width: '100%', margin: 'var(--space-sm) 0' }}>
      <div style={{ position: 'relative', width: '100%', height: `${chartHeight}px` }}>
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: '100%', display: 'block', overflow: 'visible' }}>
          <defs>
            <linearGradient id="rainGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="var(--green-primary)" stopOpacity="0.4" />
              <stop offset="50%" stopColor="var(--green-light)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="var(--green-primary)" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          
          {/* Area fill */}
          <path
            d={areaPath}
            fill="url(#rainGradient)"
            style={{ transition: 'all 0.6s ease' }}
          />
          
          {/* Rainfall curve */}
          <path
            d={linePath}
            fill="none"
            stroke="var(--green-primary)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ transition: 'all 0.6s ease' }}
          />
          
          {/* Data points */}
          {data.map((day, i) => {
            const x = getX(i, data.length);
            const y = getY(day.rainAmount);
            return (
              <g key={i}>
                <circle
                  cx={x}
                  cy={y}
                  r={day.rainChance > 50 ? "5" : "3"}
                  fill={day.rainChance > 50 ? "var(--green-light)" : "var(--green-primary)"}
                  stroke="var(--bg-card)"
                  strokeWidth="2"
                  style={{ transition: 'all 0.6s ease', opacity: day.rainAmount > 0 ? 1 : 0.5 }}
                />
                {/* Tooltip */}
                <title>{`${day.date.toLocaleDateString()}: ${day.rainAmount}mm (${day.rainChance}% chance)`}</title>
              </g>
            );
          })}
        </svg>
        
        {/* Rainfall amount labels */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', padding: '0 var(--space-xs)' }}>
          {data.map((day, i) => (
            <div key={i} style={{ textAlign: 'center', flex: 1 }}>
              {day.rainAmount > 0 && (
                <div style={{ fontSize: '10px', color: 'var(--green-light)', fontWeight: 600, marginBottom: '2px' }}>
                  {day.rainAmount}mm
                </div>
              )}
              <div style={{ fontSize: '9px', color: day.rainChance > 50 ? 'var(--green-light)' : 'var(--text-tertiary)' }}>
                {day.rainChance}%
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Day labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-tertiary)', paddingTop: 'var(--space-md)' }}>
        {data.map((day, i) => (
          <div key={i} style={{ textAlign: 'center', flex: 1 }}>
            {i === 0 ? 'Today' : day.date.toLocaleDateString('en-US', { weekday: 'short' })}
          </div>
        ))}
      </div>
    </div>
  );
};

interface InsightItemProps {
  icon: string;
  title: string;
  text: string;
}

const InsightItem: React.FC<InsightItemProps> = ({ icon, title, text }) => (
  <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'flex-start' }}>
    <div style={{ fontSize: 'var(--h3)' }}>{icon}</div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 'var(--body)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>{title}</div>
      <div style={{ fontSize: 'var(--body)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{text}</div>
    </div>
  </div>
);

interface CultivationCardProps {
  recommendation: {
    category: string;
    action: string;
    timing: string;
    details: string;
    expectedYield?: string;
    waterEfficiency?: string;
    expectedBenefit?: string;
    riskLevel?: string;
  };
}

const CultivationCard: React.FC<CultivationCardProps> = ({ recommendation }) => {
  const categoryIcons: Record<string, string> = {
    PLANTING: '🌾',
    IRRIGATION: '💧',
    FERTILIZATION: '🌱',
    PEST_MANAGEMENT: '🛡️',
    HARVEST: '🌾',
  };

  return (
    <div style={{
      padding: 'var(--space-md)',
      background: 'var(--bg-tertiary)',
      borderRadius: 'var(--space-xs)',
      border: '1px solid var(--border-color)',
      borderLeft: '4px solid var(--green-primary)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
        <span style={{ fontSize: 'var(--h3)' }}>{categoryIcons[recommendation.category] || '📋'}</span>
        <div>
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>{recommendation.category}</div>
          <div style={{ fontSize: 'var(--body)', fontWeight: 600, color: 'var(--text-primary)' }}>{recommendation.action}</div>
        </div>
      </div>
      <div style={{ fontSize: 'var(--body)', color: 'var(--text-secondary)', marginBottom: 'var(--space-xs)', lineHeight: 1.6 }}>
        {recommendation.details}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginTop: 'var(--space-sm)', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>Timing</div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--green-light)' }}>{recommendation.timing}</div>
        </div>
        {recommendation.expectedYield && (
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>Expected Impact</div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--green-light)' }}>{recommendation.expectedYield}</div>
          </div>
        )}
        {recommendation.waterEfficiency && (
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>Efficiency</div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--green-light)' }}>{recommendation.waterEfficiency}</div>
          </div>
        )}
        {recommendation.expectedBenefit && (
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>Benefit</div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--green-light)' }}>{recommendation.expectedBenefit}</div>
          </div>
        )}
        {recommendation.riskLevel && (
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>Risk Level</div>
            <div style={{ 
              fontSize: '12px', 
              fontWeight: 600, 
              color: recommendation.riskLevel === 'LOW' ? 'var(--green-light)' : recommendation.riskLevel === 'MODERATE' ? '#f59e0b' : '#ef4444'
            }}>
              {recommendation.riskLevel}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface RiskAlertProps {
  alert: {
    type: string;
    severity: string;
    day?: number;
    days?: number;
    impact: string;
    action: string;
    urgency: string;
  };
}

const RiskAlert: React.FC<RiskAlertProps> = ({ alert }) => {
  const severityColors: Record<string, string> = {
    LOW: 'var(--green-light)',
    MODERATE: '#f59e0b',
    HIGH: '#ef4444',
    CRITICAL: '#dc2626',
  };

  const typeIcons: Record<string, string> = {
    HEAT_STRESS: '🌡️',
    DROUGHT_RISK: '💧',
    FLOOD_RISK: '🌊',
    FROST_RISK: '❄️',
    WIND_DAMAGE: '💨',
    PEST_OUTBREAK: '🐛',
  };

  return (
    <div style={{
      padding: 'var(--space-md)',
      background: alert.severity === 'HIGH' || alert.severity === 'CRITICAL' ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-tertiary)',
      borderRadius: 'var(--space-xs)',
      border: `2px solid ${severityColors[alert.severity]}`,
      borderLeft: `4px solid ${severityColors[alert.severity]}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
        <span style={{ fontSize: 'var(--h3)' }}>{typeIcons[alert.type] || '⚠️'}</span>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: '4px' }}>
            <div style={{ fontSize: 'var(--body)', fontWeight: 600, color: 'var(--text-primary)' }}>
              {alert.type.replace('_', ' ')}
            </div>
            <div style={{
              fontSize: '11px',
              padding: '2px 6px',
              borderRadius: '4px',
              background: `${severityColors[alert.severity]}20`,
              color: severityColors[alert.severity],
              fontWeight: 600,
            }}>
              {alert.severity}
            </div>
            <div style={{
              fontSize: '11px',
              padding: '2px 6px',
              borderRadius: '4px',
              background: alert.urgency === 'HIGH' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              color: alert.urgency === 'HIGH' ? '#ef4444' : 'var(--green-light)',
              fontWeight: 600,
            }}>
              {alert.urgency} URGENCY
            </div>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
            {alert.day ? `Day ${alert.day}` : alert.days ? `Next ${alert.days} days` : 'Immediate'}
          </div>
        </div>
      </div>
      <div style={{ fontSize: 'var(--body)', color: 'var(--text-secondary)', marginBottom: 'var(--space-xs)', lineHeight: 1.6 }}>
        <strong>Impact:</strong> {alert.impact}
      </div>
      <div style={{ fontSize: 'var(--body)', color: 'var(--text-primary)', lineHeight: 1.6 }}>
        <strong>Action Required:</strong> {alert.action}
      </div>
    </div>
  );
};

interface SimpleTipCardProps {
  practice: {
    practice: string;
    tip: string;
    benefit: string;
  };
}

const SimpleTipCard: React.FC<SimpleTipCardProps> = ({ practice }) => (
  <div style={{
    padding: 'var(--space-md)',
    background: 'var(--bg-tertiary)',
    borderRadius: 'var(--space-xs)',
    border: '1px solid var(--border-color)',
    display: 'flex',
    alignItems: 'flex-start',
    gap: 'var(--space-sm)',
  }}>
    <div style={{ fontSize: 'var(--h3)', marginTop: '2px' }}>💡</div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 'var(--body)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
        {practice.practice}
      </div>
      <div style={{ fontSize: 'var(--body)', color: 'var(--text-secondary)', marginBottom: 'var(--space-xs)', lineHeight: 1.5 }}>
        {practice.tip}
      </div>
      <div style={{ fontSize: 'var(--body)', color: 'var(--green-light)', fontWeight: 500 }}>
        Benefit: {practice.benefit}
      </div>
    </div>
  </div>
);

interface MicroWeatherZoneCardProps {
  zone: {
    radius: number;
    label: string;
    description: string;
    current: {
      temperature: number;
      humidity: number;
      windSpeed: number;
      condition: string;
      pressure: number;
    };
    forecast: Array<{
      date: Date;
      high: number;
      low: number;
      condition: string;
      rainChance: number;
      rainAmount: number;
    }>;
    geminiPredictions: {
      rainfallChance: {
        next24h: number;
        next48h: number;
        next7days: number;
        confidence: number;
        analysis: string;
      };
      soilDegradationRisk: {
        risk: string;
        probability: number;
        factors: string[];
        timeframe: string;
        recommendation: string;
      };
      otherInsights: string[];
    };
  };
}

const MicroWeatherZoneCard: React.FC<MicroWeatherZoneCardProps> = ({ zone }) => {
  const riskColors: Record<string, string> = {
    LOW: 'var(--green-light)',
    MODERATE: '#f59e0b',
    HIGH: '#ef4444',
    CRITICAL: '#dc2626',
  };

  return (
    <div className="card-apple" style={{ border: '2px solid var(--border-color)' }}>
      {/* Zone Header */}
      <div style={{ marginBottom: 'var(--space-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-xs)', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
          <div>
            <h3 style={{ fontSize: 'var(--h2)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
              {zone.label}
            </h3>
            <p style={{ fontSize: 'var(--body)', color: 'var(--text-secondary)' }}>{zone.description}</p>
          </div>
          <div style={{
            padding: 'var(--space-xs) var(--space-md)',
            borderRadius: 'var(--space-xs)',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid var(--green-primary)',
            color: 'var(--green-light)',
            fontSize: 'var(--body)',
            fontWeight: 600,
          }}>
            {zone.radius}km Radius
          </div>
        </div>
      </div>

      {/* Current Weather */}
      <div style={{ 
        padding: 'var(--space-md)', 
        background: 'var(--bg-tertiary)', 
        borderRadius: 'var(--space-xs)',
        marginBottom: 'var(--space-md)',
        border: '1px solid var(--border-color)',
      }}>
        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: 'var(--space-sm)' }}>Current Conditions</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 'var(--space-md)' }}>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>Temperature</div>
            <div style={{ fontSize: 'var(--h3)', fontWeight: 600, color: 'var(--text-primary)' }}>{zone.current.temperature}°C</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>Condition</div>
            <div style={{ fontSize: 'var(--body)', fontWeight: 600, color: 'var(--text-primary)' }}>{zone.current.condition}</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>Humidity</div>
            <div style={{ fontSize: 'var(--body)', fontWeight: 600, color: 'var(--text-primary)' }}>{zone.current.humidity}%</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>Wind Speed</div>
            <div style={{ fontSize: 'var(--body)', fontWeight: 600, color: 'var(--text-primary)' }}>{zone.current.windSpeed} km/h</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>Pressure</div>
            <div style={{ fontSize: 'var(--body)', fontWeight: 600, color: 'var(--text-primary)' }}>{zone.current.pressure} hPa</div>
          </div>
        </div>
      </div>

      {/* Gemini AI Predictions */}
      <div style={{ marginBottom: 'var(--space-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
          <h4 style={{ fontSize: 'var(--h3)', fontWeight: 600, color: 'var(--text-primary)' }}>
            🤖 AI Predictions (Gemini)
          </h4>
          <div className="pill" style={{ background: 'rgba(16, 185, 129, 0.15)', borderColor: 'var(--green-primary)', color: 'var(--green-light)', fontSize: '11px' }}>
            Powered by Gemini AI
          </div>
        </div>

        {/* Rainfall Chance Prediction */}
        <div style={{ 
          padding: 'var(--space-md)', 
          background: 'rgba(16, 185, 129, 0.08)', 
          borderRadius: 'var(--space-xs)',
          border: '1px solid var(--green-primary)',
          marginBottom: 'var(--space-md)',
        }}>
          <div style={{ fontSize: 'var(--body)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-sm)' }}>
            🌧️ Rainfall Probability
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--space-md)', marginBottom: 'var(--space-sm)' }}>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Next 24h</div>
              <div style={{ fontSize: 'var(--h3)', fontWeight: 700, color: zone.geminiPredictions.rainfallChance.next24h > 50 ? 'var(--green-light)' : 'var(--text-primary)' }}>
                {zone.geminiPredictions.rainfallChance.next24h}%
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Next 48h</div>
              <div style={{ fontSize: 'var(--h3)', fontWeight: 700, color: zone.geminiPredictions.rainfallChance.next48h > 50 ? 'var(--green-light)' : 'var(--text-primary)' }}>
                {zone.geminiPredictions.rainfallChance.next48h}%
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Next 7 Days</div>
              <div style={{ fontSize: 'var(--h3)', fontWeight: 700, color: zone.geminiPredictions.rainfallChance.next7days > 50 ? 'var(--green-light)' : 'var(--text-primary)' }}>
                {zone.geminiPredictions.rainfallChance.next7days}%
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Confidence</div>
              <div style={{ fontSize: 'var(--body)', fontWeight: 600, color: 'var(--green-light)' }}>
                {zone.geminiPredictions.rainfallChance.confidence}%
              </div>
            </div>
          </div>
          <div style={{ fontSize: 'var(--body)', color: 'var(--text-secondary)', lineHeight: 1.6, fontStyle: 'italic', marginTop: 'var(--space-sm)', padding: 'var(--space-sm)', background: 'var(--bg-tertiary)', borderRadius: 'var(--space-xs)' }}>
            💡 {zone.geminiPredictions.rainfallChance.analysis}
          </div>
        </div>

        {/* Soil Degradation Risk */}
        <div style={{ 
          padding: 'var(--space-md)', 
          background: zone.geminiPredictions.soilDegradationRisk.risk === 'HIGH' ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-tertiary)', 
          borderRadius: 'var(--space-xs)',
          border: `2px solid ${riskColors[zone.geminiPredictions.soilDegradationRisk.risk]}`,
          marginBottom: 'var(--space-md)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-sm)', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
            <div style={{ fontSize: 'var(--body)', fontWeight: 600, color: 'var(--text-primary)' }}>
              🌱 Soil Quality Degradation Risk
            </div>
            <div style={{
              padding: '4px 12px',
              borderRadius: '6px',
              background: `${riskColors[zone.geminiPredictions.soilDegradationRisk.risk]}20`,
              color: riskColors[zone.geminiPredictions.soilDegradationRisk.risk],
              fontSize: '12px',
              fontWeight: 600,
            }}>
              {zone.geminiPredictions.soilDegradationRisk.risk} RISK ({zone.geminiPredictions.soilDegradationRisk.probability}%)
            </div>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: 'var(--space-xs)' }}>
            Timeframe: {zone.geminiPredictions.soilDegradationRisk.timeframe}
          </div>
          <div style={{ fontSize: 'var(--body)', color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)', lineHeight: 1.6 }}>
            <strong>Risk Factors:</strong>
            <ul style={{ margin: 'var(--space-xs) 0', paddingLeft: 'var(--space-md)' }}>
              {zone.geminiPredictions.soilDegradationRisk.factors.map((factor, i) => (
                <li key={i} style={{ marginBottom: '4px' }}>{factor}</li>
              ))}
            </ul>
          </div>
          <div style={{ 
            padding: 'var(--space-sm)', 
            background: 'rgba(16, 185, 129, 0.1)', 
            borderRadius: 'var(--space-xs)',
            borderLeft: '3px solid var(--green-primary)',
            fontSize: 'var(--body)',
            color: 'var(--text-primary)',
            fontWeight: 500,
          }}>
            💡 <strong>Recommendation:</strong> {zone.geminiPredictions.soilDegradationRisk.recommendation}
          </div>
        </div>

        {/* Other Insights */}
        {zone.geminiPredictions.otherInsights.length > 0 && (
          <div style={{ 
            padding: 'var(--space-md)', 
            background: 'var(--bg-tertiary)', 
            borderRadius: 'var(--space-xs)',
            border: '1px solid var(--border-color)',
          }}>
            <div style={{ fontSize: 'var(--body)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-sm)' }}>
              🔍 Additional Insights
            </div>
            <div style={{ display: 'grid', gap: 'var(--space-xs)' }}>
              {zone.geminiPredictions.otherInsights.map((insight, i) => (
                <div key={i} style={{ fontSize: 'var(--body)', color: 'var(--text-secondary)', lineHeight: 1.6, paddingLeft: 'var(--space-sm)', borderLeft: '2px solid var(--green-primary)' }}>
                  {insight}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Weather;

