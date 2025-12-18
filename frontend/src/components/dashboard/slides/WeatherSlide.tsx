import { Cloud, Droplets, Wind, AlertTriangle, Snowflake, ExternalLink, Thermometer, RefreshCw } from 'lucide-react';
import { useWeather, type WeatherForecastDay } from '@/hooks/useHub';
import { format, parseISO } from 'date-fns';

// Map weather condition icons to emoji
const iconMap: Record<string, string> = {
  sun: '☀️',
  'cloud-sun': '🌤️',
  cloud: '☁️',
  'cloud-fog': '🌫️',
  'cloud-rain': '🌧️',
  'cloud-snow': '🌨️',
  'cloud-lightning': '⛈️',
};

interface WeatherSlideProps {
  onExpand?: () => void;
}

export function WeatherSlide({ onExpand }: WeatherSlideProps) {
  // Default to Lakewood, CO (Apex Restoration location)
  const { data, isLoading, error, refetch, isFetching } = useWeather({ location: 'Lakewood, CO' });

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-4">
        <Cloud className="w-12 h-12 text-slate-600 mb-3" />
        <p className="text-slate-400 text-sm font-medium">Unable to load weather</p>
        <p className="text-slate-500 text-xs mt-1 mb-3">
          {error?.message || 'Weather data unavailable'}
        </p>
        <button
          onClick={(e) => { e.stopPropagation(); refetch(); }}
          disabled={isFetching}
          className="flex items-center gap-2 px-3 py-1.5 text-xs text-sky-400 hover:text-sky-300 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${isFetching ? 'animate-spin' : ''}`} />
          {isFetching ? 'Loading...' : 'Retry'}
        </button>
      </div>
    );
  }

  const { current, forecast, alerts, location } = data;
  const weatherEmoji = iconMap[current.icon] || '🌡️';

  return (
    <div className="h-full flex flex-col">
      {/* Sub-header with location */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800/50 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <Cloud className="w-4 h-4 text-sky-400" />
          <span className="text-sm font-medium text-white">{location}</span>
        </div>
        {onExpand && (
          <button
            onClick={(e) => { e.stopPropagation(); onExpand(); }}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
            title="Open detailed weather"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-y-auto">
        {/* Current Weather - Hero Section */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-6xl font-bold text-white">{Math.round(current.temp_f)}</span>
              <span className="text-2xl text-slate-400">°F</span>
            </div>
            <p className="text-lg text-slate-300 mt-1">{current.condition}</p>
            <p className="text-sm text-slate-500">Feels like {Math.round(current.feels_like_f)}°</p>
          </div>
          <div className="text-7xl">{weatherEmoji}</div>
        </div>

        {/* Current conditions grid */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-slate-700/50 rounded-lg p-3 text-center">
            <Droplets className="w-5 h-5 text-sky-400 mx-auto mb-1" />
            <p className="text-lg font-semibold text-white">{current.humidity}%</p>
            <p className="text-xs text-slate-400">Humidity</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-3 text-center">
            <Wind className="w-5 h-5 text-slate-400 mx-auto mb-1" />
            <p className="text-lg font-semibold text-white">{Math.round(current.wind_mph)} mph</p>
            <p className="text-xs text-slate-400">{current.wind_direction}</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-3 text-center">
            <Thermometer className="w-5 h-5 text-orange-400 mx-auto mb-1" />
            <p className="text-lg font-semibold text-white">{Math.round(current.feels_like_f)}°</p>
            <p className="text-xs text-slate-400">Feels Like</p>
          </div>
        </div>

        {/* Alerts */}
        {alerts && alerts.length > 0 && (
          <div className="mb-4 space-y-2">
            {alerts.map((alert, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg"
              >
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-400">{alert}</p>
              </div>
            ))}
          </div>
        )}

        {/* 5-Day Forecast */}
        <div>
          <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
            5-Day Forecast
          </h4>
          <div className="grid grid-cols-5 gap-2">
            {forecast.slice(0, 5).map((day) => (
              <ForecastDay key={day.date} day={day} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ForecastDay({ day }: { day: WeatherForecastDay }) {
  const emoji = iconMap[day.icon] || '🌡️';
  const hasPrecip = day.chance_of_rain > 20 || day.chance_of_snow > 20;
  const precipChance = Math.max(day.chance_of_rain, day.chance_of_snow);
  const isSnow = day.chance_of_snow > day.chance_of_rain;

  return (
    <div className="flex flex-col items-center p-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors">
      <span className="text-xs font-medium text-slate-400">
        {format(parseISO(day.date), 'EEE')}
      </span>
      <span className="text-2xl my-2">{emoji}</span>
      <div className="flex items-center gap-1 text-sm">
        <span className="text-white font-semibold">{Math.round(day.high_f)}°</span>
        <span className="text-slate-500">{Math.round(day.low_f)}°</span>
      </div>
      {hasPrecip && (
        <div className="flex items-center gap-1 text-xs text-sky-400 mt-1">
          {isSnow ? (
            <Snowflake className="w-3 h-3" />
          ) : (
            <Droplets className="w-3 h-3" />
          )}
          <span>{precipChance}%</span>
        </div>
      )}
    </div>
  );
}
