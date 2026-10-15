import { Router } from 'express';
import { z } from 'zod';
import { authenticate, optionalAuthenticate } from '../auth/auth.middleware.js';
import { validate } from '../../common/middleware/validate.js';
import { asyncHandler } from '../../common/middleware/asyncHandler.js';
import { MarketPrice } from './marketPrice.model.js';
import { ok } from '../../common/utils/apiResponse.js';
import { AppError } from '../../common/errors/AppError.js';
import { aiProvider } from '../../integrations/ai/index.js';
import { marketDataProvider } from '../../integrations/market-data/index.js';

export const marketIntelligenceRouter = Router();

marketIntelligenceRouter.get(
  '/prices',
  asyncHandler(async (req, res) => {
    const crop = String(req.query.crop || '').trim();
    if (!crop) throw AppError.badRequest('crop query param required');
    const county = req.query.county ? String(req.query.county) : undefined;
    const filter: Record<string, unknown> = { crop: new RegExp(`^${crop}$`, 'i') };
    if (county) filter.county = county;
    const items = await MarketPrice.find(filter).sort({ observedAt: -1 }).limit(200).lean();

    // If no stored data, fetch from provider (clearly labelled)
    if (items.length === 0) {
      const provider = await marketDataProvider.getPrices(crop, { county });
      return ok(res, provider, 'Prices retrieved from provider (demo data if isDemo=true)');
    }
    return ok(res, items, 'Prices retrieved');
  }),
);

marketIntelligenceRouter.get(
  '/prices/history',
  asyncHandler(async (req, res) => {
    const crop = String(req.query.crop || '').trim();
    const county = req.query.county ? String(req.query.county) : undefined;
    if (!crop) throw AppError.badRequest('crop query param required');
    const filter: Record<string, unknown> = { crop: new RegExp(`^${crop}$`, 'i') };
    if (county) filter.county = county;
    const items = await MarketPrice.find(filter).sort({ observedAt: 1 }).limit(500).lean();
    return ok(res, items, 'Price history retrieved');
  }),
);

marketIntelligenceRouter.get(
  '/prices/compare',
  asyncHandler(async (req, res) => {
    const crop = String(req.query.crop || '').trim();
    if (!crop) throw AppError.badRequest('crop query param required');
    const items = await MarketPrice.find({ crop: new RegExp(`^${crop}$`, 'i') })
      .sort({ observedAt: -1 })
      .limit(500)
      .lean();
    // Latest per county
    const byCounty = new Map<string, typeof items[number]>();
    for (const it of items) {
      if (!byCounty.has(it.county)) byCounty.set(it.county, it);
    }
    const comparison = Array.from(byCounty.values()).map((it) => ({
      county: it.county,
      market: it.market,
      priceCents: it.priceCents,
      unit: it.unit,
      observedAt: it.observedAt,
      source: it.source,
    }));
    return ok(res, comparison, 'Price comparison retrieved');
  }),
);

const recommendSchema = z.object({
  crop: z.string().min(1).max(80),
  county: z.string().min(1).max(80).optional(),
  unit: z.string().min(1).max(20).default('kg'),
  qualityGrade: z.string().max(20).optional(),
});

marketIntelligenceRouter.post(
  '/price-recommendation',
  authenticate,
  validate(recommendSchema),
  asyncHandler(async (req, res) => {
    const { crop, county, unit, qualityGrade } = req.body;

    const filter: Record<string, unknown> = { crop: new RegExp(`^${crop}$`, 'i') };
    if (county) filter.county = county;
    const recent = await MarketPrice.find(filter).sort({ observedAt: -1 }).limit(50).lean();

    const isDemo = recent.length === 0;
    const prices = isDemo
      ? await marketDataProvider.getPrices(crop, { county })
      : recent.map((r) => ({
          priceCents: r.priceCents,
          unit: r.unit,
          county: r.county,
          observedAt: r.observedAt.toISOString(),
          source: r.source,
          isDemo: r.isDemo,
        }));

    const cents = prices.map((p) => p.priceCents);
    const min = cents.length ? Math.min(...cents) : 0;
    const max = cents.length ? Math.max(...cents) : 0;
    const avg = cents.length ? Math.round(cents.reduce((a, b) => a + b, 0) / cents.length) : 0;

    let explanation =
      'Recommendation based on recent market observations. Historical data may be limited.';
    if (isDemo) {
      explanation =
        'DEMO estimate: no live market data available for this crop/region. Values are illustrative only.';
    }

    // Optional AI-enhanced narrative (only when a real provider is configured)
    let aiNarrative: string | undefined;
    if (!aiProvider.isDemo && prices.length > 0) {
      try {
        const completion = await aiProvider.complete(
          [
            {
              role: 'system',
              content:
                'You are an agricultural market analyst. Provide a short, cautious price explanation. Do not invent data. Reference only the numbers provided.',
            },
            {
              role: 'user',
              content: `Crop: ${crop}. County: ${county ?? 'multiple'}. Unit: ${unit}. Min: ${min} cents. Max: ${max} cents. Avg: ${avg} cents. Grade: ${qualityGrade ?? 'unspecified'}.`,
            },
          ],
          { maxTokens: 250, temperature: 0.3 },
        );
        aiNarrative = completion.content;
      } catch {
        aiNarrative = undefined;
      }
    }

    return ok(res, {
      crop,
      county: county ?? null,
      unit,
      currency: 'KES',
      estimatedMinPrice: min / 100,
      estimatedMaxPrice: max / 100,
      suggestedPrice: avg ? avg / 100 : null,
      sources: Array.from(new Set(prices.map((p) => p.source))),
      observationPeriod: {
        from: prices[prices.length - 1]?.observedAt ?? null,
        to: prices[0]?.observedAt ?? null,
        count: prices.length,
      },
      confidence: isDemo ? 0.2 : Math.min(0.9, 0.4 + prices.length / 100),
      isDemo,
      explanation,
      aiNarrative,
      generatedAt: new Date().toISOString(),
    }, 'Price recommendation generated');
  }),
);