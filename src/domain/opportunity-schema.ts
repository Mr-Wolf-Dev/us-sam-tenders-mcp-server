import { z } from 'zod';

export const ActorInputSchema = z.object({
  query: z.string().trim().default(''),
  noticeTypes: z.array(z.string().trim().min(1)).default([]),
  departments: z.array(z.string().trim().min(1)).default([]),
  activeOnly: z.boolean().default(true),
  publishedFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'publishedFrom must be YYYY-MM-DD')
    .optional(),
  minDeadline: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'minDeadline must be YYYY-MM-DD')
    .optional(),
  includeDetails: z.boolean().default(false),
  maxItems: z.number().int().min(1).max(1000).default(50),
});

export type ActorInput = z.infer<typeof ActorInputSchema>;

/**
 * Validates and normalizes raw Actor/MCP input.
 */
export function parseActorInput(raw: unknown): ActorInput {
  return ActorInputSchema.parse(raw ?? {});
}

export const PointOfContactSchema = z.object({
  fullName: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  type: z.string().nullable(),
});

export type PointOfContact = z.infer<typeof PointOfContactSchema>;

export const NormalizedOpportunitySchema = z.object({
  opportunityId: z.string().min(1),
  solicitationNumber: z.string().nullable(),
  title: z.string().min(1),
  noticeTypeCode: z.string().nullable(),
  noticeType: z.string().nullable(),
  department: z.string().nullable(),
  agency: z.string().nullable(),
  office: z.string().nullable(),
  isActive: z.boolean(),
  isCanceled: z.boolean(),
  publishedDate: z.string().nullable(),
  modifiedDate: z.string().nullable(),
  responseDeadline: z.string().nullable(),
  naicsCodes: z.array(z.string()),
  classificationCode: z.string().nullable(),
  pointOfContact: z.array(PointOfContactSchema),
  description: z.string().nullable(),
  samUrl: z.string().url(),
});

export type NormalizedOpportunity = z.infer<typeof NormalizedOpportunitySchema>;
