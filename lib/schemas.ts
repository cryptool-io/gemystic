import { z } from 'zod';

/**
 * Centralised zod schemas (Trust-Agent lib/schemas.ts convention). Every API
 * route validates its input through a schema from this file; hand-rolled
 * validation migrates here as routes are touched (NEXT-SESSION M8).
 */

export const contactSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(200),
  email: z.string().trim().email('That email address does not look right.'),
  subject: z.string().trim().max(300).optional().default(''),
  message: z.string().trim().min(1, 'Message is required.').max(5000),
  /** Honeypot: humans never see it, bots fill it. */
  website: z.string().max(0).optional().or(z.literal('')),
});

export const reviewSchema = z.object({
  authorName: z.string().trim().min(1).max(120),
  authorEmail: z.string().trim().email(),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().min(1).max(160),
  body: z.string().trim().min(1).max(4000),
  productSlug: z.string().trim().max(120).optional().nullable(),
  website: z.string().max(0).optional().or(z.literal('')),
});

export const campaignSchema = z
  .object({
    name: z.string().trim().min(1, 'Campaign name is required.').max(120),
    percentOff: z.coerce.number().int().min(0).max(90),
    species: z.array(z.string()).default([]),
    categories: z.array(z.string()).default([]),
    startsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date is required.'),
    endsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date is required.'),
    active: z.boolean().default(true),
    code: z
      .string()
      .trim()
      .max(40)
      .transform((v) => (v ? v.toUpperCase() : null))
      .nullable()
      .default(null),
    freeShipping: z.boolean().default(false),
  })
  .refine((c) => new Date(c.endsAt) >= new Date(c.startsAt), {
    message: 'End date must not be before the start date.',
    path: ['endsAt'],
  })
  .refine((c) => c.percentOff > 0 || c.freeShipping, {
    message: 'A 0% campaign must at least grant free shipping.',
    path: ['percentOff'],
  });

export type ContactInput = z.infer<typeof contactSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
export type CampaignInput = z.infer<typeof campaignSchema>;
