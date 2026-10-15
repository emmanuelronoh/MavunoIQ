import { logger } from '../../config/logger.js';

export interface MarketPriceRecord {
  crop: string;
  market: string;
  county: string;
  priceCents: number;
  unit: string;
  currency: 'KES';
  observedAt: string;
  source: string;
  isDemo: boolean;
}

export interface MarketDataProvider {
  name: string;
  isDemo: boolean;
  getPrices(crop: string, opts?: { county?: string }): Promise<MarketPriceRecord[]>;
}

class DemoMarketDataProvider implements MarketDataProvider {
  name = 'demo';
  isDemo = true;
  async getPrices(crop: string, opts: { county?: string } = {}): Promise<MarketPriceRecord[]> {
    const base: Record<string, number> = {
      tomato: 8000,
      maize: 4500,
      potato: 3500,
      onion: 6500,
      kale: 3000,
      cabbage: 2500,
    };
    const basePrice = base[crop.toLowerCase()] ?? 5000;
    const counties = opts.county ? [opts.county] : ['Nairobi', 'Nakuru', 'Kiambu', 'Meru'];
    const now = new Date().toISOString();
    return counties.map((county, i) => ({
      crop,
      market: `${county} Market`,
      county,
      priceCents: basePrice + i * 250,
      unit: 'kg',
      currency: 'KES',
      observedAt: now,
      source: 'demo-market-data',
      isDemo: true,
    }));
  }
}

function createMarketDataProvider(): MarketDataProvider {
  // Only demo provider available. A real provider can be plugged in here.
  return new DemoMarketDataProvider();
}

export const marketDataProvider: MarketDataProvider = createMarketDataProvider();