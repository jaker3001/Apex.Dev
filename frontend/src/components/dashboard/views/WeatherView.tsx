import { useState } from 'react';
import {
  Cloud,
  Droplets,
  Wind,
  AlertTriangle,
  Snowflake,
  Thermometer,
  Search,
  MapPin,
  Gauge,
} from 'lucide-react';
import { useWeather, type WeatherForecastDay } from '@/hooks/useHub';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

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

export function WeatherView() {
  const [searchLocation, setSearchLocation] = useState('');
  const [activeLocation, setActiveLocation] = useState('Lakewood, CO');

  const { data, isLoading, error } = useWeather({ location: activeLocation });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchLocation.trim()) {
      setActiveLocation(searchLocation.trim());
      setSearchLocation('');
    }
  };

  const quickLocations = [
    'Lakewood, CO',
    'Denver, CO',
    'Aurora, CO',
    'Boulder, CO',
  ];

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6">
        <Cloud className="w-16 h-16 text-slate-600 mb-4" />
        <p className="text-slate-400 text-lg font-medium">Unable to load weather</p>
        <p className="text-slate-500 text-sm mt-1">Please try a different location</p>
        <form onSubmit={handleSearch} className="mt-6 flex gap-2">
          <input
            type="text"
            value={searchLocation}
            onChange={(e) => setSearchLocation(e.target.value)}
            placeholder="Enter city name..."
            className="px-4 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-sky-500 focus:outline-none"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
          >
            Search
          </button>
        </form>
      </div>
    );
  }

  const { current, forecast, alerts, location } = data;
  const weatherEmoji = iconMap[current.icon] || '🌡️';

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6">
        {/* Search Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-sky-400" />
            <h2 className="text-xl font-semibold text-white">{location}</h2>
          </div>
          <form onSubmit={handleSearch} className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
                placeholder="Search location..."
                className="w-full sm:w-64 pl-10 pr-4 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-sky-500 focus:outline-none text-sm"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors text-sm font-medium"
            >
              Search
            </button>
          </form>
        </div>

        {/* Quick location buttons */}
        <div className="flex flex-wrap gap-2 mb-6">
          {quickLocations.map((loc) => (
            <button
              key={loc}
              onClick={() => setActiveLocation(loc)}
              className={cn(
                'px-3 py-1.5 text-sm rounded-lg transition-colors',
                activeLocation === loc
                  ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                  : 'bg-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-700'
              )}
            >
              {loc}
            </button>
          ))}
        </div>

        {/* Alerts */}
        {alerts && alerts.length > 0 && (
          <div className="mb-6 space-y-2">
            {alerts.map((alert, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl"
              >
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-400">{alert}</p>
              </div>
            ))}
          </div>
        )}

        {/* Current Weather - Hero */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-800/50 rounded-2xl p-8 mb-6 border border-slate-700">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left">
              <div className="flex items-baseline gap-2 justify-center md:justify-start">
                <span className="text-8xl font-bold text-white">
                  {Math.round(current.temp_f)}
                </span>
                <span className="text-4xl text-slate-400">°F</span>
              </div>
              <p className="text-2xl text-slate-300 mt-2">{current.condition}</p>
              <p className="text-lg text-slate-500 mt-1">
                Feels like {Math.round(current.feels_like_f)}°F
              </p>
            </div>
            <div className="text-9xl">{weatherEmoji}</div>
          </div>
        </div>

        {/* Current Conditions Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <ConditionCard
            icon={<Droplets className="w-6 h-6 text-sky-400" />}
            label="Humidity"
            value={`${current.humidity}%`}
          />
          <ConditionCard
            icon={<Wind className="w-6 h-6 text-slate-400" />}
            label="Wind"
            value={`${Math.round(current.wind_mph)} mph ${current.wind_direction}`}
          />
          <ConditionCard
            icon={<Thermometer className="w-6 h-6 text-orange-400" />}
            label="Feels Like"
            value={`${Math.round(current.feels_like_f)}°F`}
          />
          <ConditionCard
            icon={<Gauge className="w-6 h-6 text-purple-400" />}
            label="Temp (C)"
            value={`${Math.round(current.temp_c)}°C`}
          />
        </div>

        {/* 7-Day Forecast */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-white mb-4">7-Day Forecast</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {forecast.map((day, index) => (
              <ForecastDayCard key={day.date} day={day} isToday={index === 0} />
            ))}
          </div>
        </div>

        {/* Extended Forecast Table */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Detailed Forecast</h3>
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left text-sm font-medium text-slate-400 px-4 py-3">Day</th>
                  <th className="text-center text-sm font-medium text-slate-400 px-4 py-3">Condition</th>
                  <th className="text-center text-sm font-medium text-slate-400 px-4 py-3">High</th>
                  <th className="text-center text-sm font-medium text-slate-400 px-4 py-3">Low</th>
                  <th className="text-center text-sm font-medium text-slate-400 px-4 py-3">Rain</th>
                  <th className="text-center text-sm font-medium text-slate-400 px-4 py-3">Snow</th>
                </tr>
              </thead>
              <tbody>
                {forecast.map((day, index) => {
                  const emoji = iconMap[day.icon] || '🌡️';
                  return (
                    <tr
                      key={day.date}
                      className={cn(
                        'border-b border-slate-700/50 last:border-0',
                        index === 0 && 'bg-sky-500/5'
                      )}
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-white">
                            {index === 0 ? 'Today' : format(parseISO(day.date), 'EEEE')}
                          </p>
                          <p className="text-xs text-slate-500">
                            {format(parseISO(day.date), 'MMM d')}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-xl">{emoji}</span>
                          <span className="text-sm text-slate-300">{day.condition}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm font-semibold text-white">
                          {Math.round(day.high_f)}°
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm text-slate-400">
                          {Math.round(day.low_f)}°
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {day.chance_of_rain > 0 ? (
                          <div className="flex items-center justify-center gap-1 text-sm text-sky-400">
                            <Droplets className="w-3.5 h-3.5" />
                            {day.chance_of_rain}%
                          </div>
                        ) : (
                          <span className="text-sm text-slate-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {day.chance_of_snow > 0 ? (
                          <div className="flex items-center justify-center gap-1 text-sm text-blue-400">
                            <Snowflake className="w-3.5 h-3.5" />
                            {day.chance_of_snow}%
                          </div>
                        ) : (
                          <span className="text-sm text-slate-500">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConditionCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 text-center">
      <div className="flex justify-center mb-2">{icon}</div>
      <p className="text-lg font-semibold text-white">{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  );
}

function ForecastDayCard({ day, isToday }: { day: WeatherForecastDay; isToday?: boolean }) {
  const emoji = iconMap[day.icon] || '🌡️';
  const hasPrecip = day.chance_of_rain > 20 || day.chance_of_snow > 20;
  const precipChance = Math.max(day.chance_of_rain, day.chance_of_snow);
  const isSnow = day.chance_of_snow > day.chance_of_rain;

  return (
    <div
      className={cn(
        'flex flex-col items-center p-4 rounded-xl border transition-colors',
        isToday
          ? 'bg-sky-500/10 border-sky-500/30'
          : 'bg-slate-800/50 border-slate-700 hover:bg-slate-700/50'
      )}
    >
      <span className={cn('text-sm font-medium', isToday ? 'text-sky-400' : 'text-slate-400')}>
        {isToday ? 'Today' : format(parseISO(day.date), 'EEE')}
      </span>
      <span className="text-xs text-slate-500">{format(parseISO(day.date), 'MMM d')}</span>
      <span className="text-4xl my-3">{emoji}</span>
      <div className="flex items-center gap-2 text-sm">
        <span className="font-semibold text-white">{Math.round(day.high_f)}°</span>
        <span className="text-slate-500">{Math.round(day.low_f)}°</span>
      </div>
      {hasPrecip && (
        <div className="flex items-center gap-1 text-xs text-sky-400 mt-2">
          {isSnow ? <Snowflake className="w-3 h-3" /> : <Droplets className="w-3 h-3" />}
          <span>{precipChance}%</span>
        </div>
      )}
    </div>
  );
}
