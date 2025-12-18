import { Cloud, Droplets, Wind, AlertTriangle, Snowflake } from 'lucide-react';
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

export function WeatherCard() {
  // Default to Lakewood, CO (Apex Restoration location)
  const { data, isLoading, error } = useWeather({ location: 'Lakewood, CO' });

  if (isLoading) {
    return (
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-sky-400" />
            <h3 className="font-semibold text-white">Weather</h3>
          </div>
        </div>
        <div className="p-4 flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-sky-400" />
            <h3 className="font-semibold text-white">Weather</h3>
          </div>
        </div>
        <div className="p-4 text-center py-8">
          <Cloud className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <p className="text-slate-400 text-sm">Unable to load weather</p>
        </div>
      </div>
    );
  }

  const { current, forecast, alerts, location } = data;
  const weatherEmoji = iconMap[current.icon] || '🌡️';

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Cloud className="w-5 h-5 text-sky-400" />
          <h3 className="font-semibold text-white">Weather</h3>
        </div>
        <span className="text-xs text-slate-400">{location}</span>
      </div>

      {/* Current Weather */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold text-white">{Math.round(current.temp_f)}</span>
              <span className="text-xl text-slate-400">°F</span>
            </div>
            <p className="text-sm text-slate-400">{current.condition}</p>
          </div>
          <div className="text-5xl">{weatherEmoji}</div>
        </div>

        <div className="flex items-center gap-4 text-sm text-slate-400">
          <div className="flex items-center gap-1">
            <Droplets className="w-4 h-4 text-sky-400" />
            <span>{current.humidity}%</span>
          </div>
          <div className="flex items-center gap-1">
            <Wind className="w-4 h-4 text-slate-400" />
            <span>{Math.round(current.wind_mph)} mph</span>
          </div>
          <div className="text-xs">
            Feels like {Math.round(current.feels_like_f)}°
          </div>
        </div>
      </div>

      {/* Alerts */}
      {alerts && alerts.length > 0 && (
        <div className="px-4 pb-2">
          {alerts.map((alert, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-sm"
            >
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-amber-400 text-xs">{alert}</p>
            </div>
          ))}
        </div>
      )}

      {/* Forecast */}
      <div className="px-4 pb-4">
        <div className="flex gap-2 overflow-x-auto">
          {forecast.slice(0, 5).map((day) => (
            <ForecastDay key={day.date} day={day} />
          ))}
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
    <div className="flex-shrink-0 flex flex-col items-center p-2 rounded-lg bg-slate-700/50 min-w-[60px]">
      <span className="text-xs text-slate-400">
        {format(parseISO(day.date), 'EEE')}
      </span>
      <span className="text-lg my-1">{emoji}</span>
      <div className="flex items-center gap-1 text-xs">
        <span className="text-white font-medium">{Math.round(day.high_f)}°</span>
        <span className="text-slate-500">{Math.round(day.low_f)}°</span>
      </div>
      {hasPrecip && (
        <div className="flex items-center gap-0.5 text-xs text-sky-400 mt-0.5">
          {isSnow ? (
            <Snowflake className="w-2.5 h-2.5" />
          ) : (
            <Droplets className="w-2.5 h-2.5" />
          )}
          <span>{precipChance}%</span>
        </div>
      )}
    </div>
  );
}
