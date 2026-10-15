import { z } from 'zod';

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(80).trim().optional(),
  lastName: z.string().min(1).max(80).trim().optional(),
  phone: z.string().min(7).max(32).optional(),
  avatarUrl: z.string().url().max(500).optional(),
});