import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../auth/auth.middleware.js';
import { validate } from '../../common/middleware/validate.js';
import { asyncHandler } from '../../common/middleware/asyncHandler.js';
import { ok } from '../../common/utils/apiResponse.js';
import { weatherProvider } from '../../integrations/weather/index.js';
import { aiProvider } from '../../integrations/ai/index.js';
import { AppError } from '../../common/errors/AppError.js';

export const weatherRouter = Router();

const querySchema = z.object({
  location: z.string().min(2).max(120),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
});

weatherRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = querySchema.parse(req.query);
    const snapshot = await weatherProvider.getWeather(parsed);
    return ok(res, snapshot, 'Weather retrieved');
  }),
);

const adviceSchema = z.object({
  location: z.string().min(2).max(120),
  crops: z.array(z.string().min(1).max(80)).max(10).default([]),
});

weatherRouter.post(
  '/advice',
  authenticate,
  validate(adviceSchema),
  asyncHandler(async (req, res) => {
    const { location, crops } = req.body;
    const snapshot = await weatherProvider.getWeather({ location });

    const risks: string[] = [];
    const actions: string[] = [];
    const affected: string[] = [];

    const rain = snapshot.current.rainProbability ?? 0;
    if (rain >= 60) {
      risks.push('High probability of rainfall');
      actions.push('Check drainage and protect harvested produce from moisture');
      crops.forEach((c) => affected.push(c));
    } else if (rain <= 15 && snapshot.current.tempC > 28) {
      risks.push('Dry and hot conditions');
      actions.push('Plan irrigation and provide shade for sensitive crops');
      crops.forEach((c) => affected.push(c));
    }
    if (snapshot.current.windKph > 30) {
      risks.push('Strong winds');
      actions.push('Secure greenhouse structures and young plants');
    }
    if (snapshot.alerts?.length) {
      snapshot.alerts.forEach((a) => risks.push(`${a.severity}: ${a.title}`));
    }

    let aiSummary: string | undefined;
    if (!aiProvider.isDemo) {
      try {
        const completion = await aiProvider.complete(
          [
            {
              role: 'system',
              content:
                'You are an agricultural advisor. Given weather data and crops, provide 3 concise, practical actions. Do not overstate certainty.',
            },
            {
              role: 'user',
              content: `Weather: ${snapshot.current.condition}, temp ${snapshot.current.tempC}C, humidity ${snapshot.current.humidity}%, wind ${snapshot.current.windKph} kph, rain ${rain}%. Crops: ${crops.join(', ') || 'unspecified'}.`,
            },
          ],
          { maxTokens: 300, temperature: 0.4 },
        );
        aiSummary = completion.content;
      } catch {
        aiSummary = undefined;
      }
    }

    return ok(res, {
      weather: snapshot,
      risks,
      recommendedActions: actions,
      affectedCropsOrActivities: affected,
      dataSource: snapshot.source,
      dataTimestamp: snapshot.fetchedAt,
      limitations: snapshot.isDemo
        ? 'DEMO weather data — not suitable for real farming decisions.'
        : 'Weather forecasts are probabilistic; verify with local authorities.',
      aiSummary,
    }, 'Weather advice generated');
  }),
);