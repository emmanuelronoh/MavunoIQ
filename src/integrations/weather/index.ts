import { getEnv } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { AppError } from '../../common/errors/AppError.js';

export interface WeatherSnapshot {
  location: string;
  lat?: number;
  lng?: number;
  current: {
    tempC: number;
    humidity: number;
    windKph: number;
    condition: string;
    rainProbability?: number;
  };
  hourly?: Array<{ time: string; tempC: number; rainProbability: number }>;
  daily?: Array<{ date: string; minTempC: number; maxTempC: number; rainProbability: number; condition: string }>;
  alerts?: Array<{ title: string; severity: string; description: string }>;
  source: string;
  isDemo: boolean;
  fetchedAt: string;
}

export interface WeatherProvider {
  name: string;
  isDemo: boolean;
  getWeather(opts: { location: string; lat?: number; lng?: number }): Promise<WeatherSnapshot>;
}

class DemoWeatherProvider implements WeatherProvider {
  name = 'demo';
  isDemo = true;
  async getWeather(opts: { location: string }): Promise<WeatherSnapshot> {
    const now = new Date();
    return {
      location: opts.location,
      current: {
        tempC: 24,
        humidity: 65,
        windKph: 12,
        condition: 'Partly cloudy',
        rainProbability: 35,
      },
      hourly: Array.from({ length: 12 }).map((_, i) => ({
        time: new Date(now.getTime() + i * 3600_000).toISOString(),
        tempC: 22 + Math.sin(i / 3) * 4,
        rainProbability: Math.max(0, Math.min(100, 30 + Math.sin(i / 2) * 30)),
      })),
      daily: Array.from({ length: 5 }).map((_, i) => ({
        date: new Date(now.getTime() + i * 86400_000).toISOString().slice(0, 10),
        minTempC: 16 + i,
        maxTempC: 27 + i,
        rainProbability: [20, 40, 65, 30, 15][i] ?? 20,
        condition: ['Sunny', 'Cloudy', 'Rain', 'Cloudy', 'Sunny'][i] ?? 'Sunny',
      })),
      source: 'demo',
      isDemo: true,
      fetchedAt: now.toISOString(),
    };
  }
}

class OpenWeatherMapProvider implements WeatherProvider {
  name = 'openweathermap';
  isDemo = false;
  constructor(private apiKey: string, private timeoutMs: number) {}
  async getWeather(opts: { location: string; lat?: number; lng?: number }): Promise<WeatherSnapshot> {
    const q = opts.lat != null && opts.lng != null ? `lat=${opts.lat}&lon=${opts.lng}` : `q=${encodeURIComponent(opts.location)}`;
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?${q}&units=metric&appid=${this.apiKey}`,
        { signal: controller.signal },
      );
      if (!res.ok) throw AppError.provider('Weather provider request failed');
      const data = (await res.json()) as {
        name: string;
        main: { temp: number; humidity: number };
        wind: { speed: number };
        weather: { description: string }[];
      };
      return {
        location: data.name,
        current: {
          tempC: data.main.temp,
          humidity: data.main.humidity,
          windKph: data.wind.speed * 3.6,
          condition: data.weather[0]?.description ?? '',
        },
        source: 'openweathermap',
        isDemo: false,
        fetchedAt: new Date().toISOString(),
      };
    } catch (err) {
      logger.error({ err }, 'Weather provider failed');
      throw err;
    } finally {
      clearTimeout(t);
    }
  }
}

function createWeatherProvider(): WeatherProvider {
  const env = getEnv();
  const provider = (env.WEATHER_PROVIDER || 'demo').toLowerCase();
  if (provider === 'openweathermap' && env.WEATHER_API_KEY) {
    return new OpenWeatherMapProvider(env.WEATHER_API_KEY, env.WEATHER_TIMEOUT_MS);
  }
  return new DemoWeatherProvider();
}

export const weatherProvider: WeatherProvider = createWeatherProvider();