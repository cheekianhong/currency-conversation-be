import { redis } from '../config/redis';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';
import { HTTP_STATUS } from '../utils/httpStatus';
import { logger } from '../utils/logger';

const CACHE_KEY = 'openexchangerates:latest';
const CACHE_TTL_SECONDS = 600;
const API_URL = 'https://openexchangerates.org/api/latest.json';

interface LatestRatesResponse {
  base: string;
  timestamp: number;
  rates: Record<string, number>;
}

export interface RateResult {
  from: string;
  to: string;
  rate: number;
  asOf: string;
}

export interface ConversionResult extends RateResult {
  amount: number;
  converted: number;
}

export interface CountriesResult {
  counties: string[];
}

export class ConvertService {
  async convert(from: string, to: string, amount?: number): Promise<RateResult | ConversionResult> {
    const latest = await this.getLatestRates();

    const rateFrom = from === 'USD' ? 1 : latest.rates[from];
    const rateTo = to === 'USD' ? 1 : latest.rates[to];

    if (!rateFrom || !rateTo) {
      throw new AppError('Unsupported currency code', HTTP_STATUS.BAD_REQUEST);
    }

    // Cross-rate via USD base from the latest rates.
    const rate = rateTo / rateFrom;
    const asOf = new Date(latest.timestamp * 1000).toISOString();

    // If amount is not provided, return just the rate
    if (amount === undefined || amount <= 0) {
      return {
        from,
        to,
        rate: this.round(rate, 2),
        asOf,
      };
    }

    // If amount is provided, return the full conversion
    const converted = amount * rate;
    return {
      from,
      to,
      amount,
      rate: this.round(rate, 2),
      converted: this.round(converted, 2),
      asOf,
    };
  }

  async listCountries(): Promise<CountriesResult> {
    const latest = await this.getLatestRates();

    return {
      counties: Object.keys(latest.rates).sort(),
    };
  }

  private async getLatestRates(): Promise<LatestRatesResponse> {
    if (!env.OPENEXCHANGERATES_APP_ID) {
      throw new AppError(
        'Open Exchange Rates App ID is not configured',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
      );
    }

    try {
      const cached = await redis.get(CACHE_KEY);
      if (cached) {
        try {
          return JSON.parse(cached) as LatestRatesResponse;
        } catch {
          await redis.del(CACHE_KEY);
        }
      }
    } catch (error) {
      logger.warn('Redis cache read failed', { error: (error as Error).message });
    }

    const url = new URL(API_URL);
    url.searchParams.set('app_id', env.OPENEXCHANGERATES_APP_ID);

    let response: Awaited<ReturnType<typeof fetch>>;
    try {
      response = await fetch(url.toString());
    } catch {
      throw new AppError('Failed to reach exchange rates provider', HTTP_STATUS.BAD_GATEWAY);
    }

    if (!response.ok) {
      throw new AppError('Failed to fetch exchange rates', HTTP_STATUS.BAD_GATEWAY);
    }

    const data = (await response.json()) as LatestRatesResponse;

    if (!data?.rates || typeof data.timestamp !== 'number' || typeof data.base !== 'string') {
      throw new AppError('Invalid exchange rates response', HTTP_STATUS.BAD_GATEWAY);
    }

    try {
      await redis.set(CACHE_KEY, JSON.stringify(data), 'EX', CACHE_TTL_SECONDS);
    } catch (error) {
      logger.warn('Redis cache write failed', { error: (error as Error).message });
    }

    return data;
  }

  private round(value: number, decimals: number): number {
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
  }
}
