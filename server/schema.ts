import { z } from 'zod';

export const KeyStatSchema = z.object({
  label: z.string(),
  value: z.string(),
  context: z.string(),
  sourceRef: z.string(),
});

export const FactSectionSchema = z.object({
  heading: z.string(),
  body: z.string(),
  sourceRef: z.string(),
});

export const TimelineItemSchema = z.object({
  year: z.string(),
  event: z.string(),
  sourceRef: z.string(),
});

export const ComparisonSchema = z.object({
  label: z.string(),
  leftLabel: z.string(),
  leftValue: z.string(),
  rightLabel: z.string(),
  rightValue: z.string(),
  sourceRef: z.string(),
});

export const ChartSchema = z.object({
  type: z.enum(['bar', 'line', 'donut']),
  title: z.string(),
  labels: z.array(z.string()),
  values: z.array(z.number()),
  sourceRef: z.string(),
});

export const SourceSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string(),
  note: z.string(),
});

export const InfographicSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string(),
  summary: z.string().min(1),
  theme: z.enum(['editorial-light', 'midnight-data']).default('editorial-light'),
  keyStats: z.array(KeyStatSchema).min(1).max(12),
  factSections: z.array(FactSectionSchema).min(1).max(10),
  timeline: z.array(TimelineItemSchema).default([]),
  comparisons: z.array(ComparisonSchema).default([]),
  charts: z.array(ChartSchema).default([]),
  sources: z.array(SourceSchema).min(1),
  confidenceScore: z.number().min(0).max(1),
  lastResearched: z.string(),
});

export type InfographicData = z.infer<typeof InfographicSchema>;

export const SCHEMA_DESCRIPTION = `{
  "title": "string — concise factual title",
  "subtitle": "string — one compelling subtitle phrase",
  "summary": "string — 1-2 sentence factual overview",
  "theme": "editorial-light | midnight-data",
  "keyStats": [
    { "label": "string", "value": "string (number+unit)", "context": "string (short context)", "sourceRef": "string (source id)" }
  ],
  "factSections": [
    { "heading": "string", "body": "string (2-4 sentences)", "sourceRef": "string (source id)" }
  ],
  "timeline": [
    { "year": "string", "event": "string (one sentence)", "sourceRef": "string (source id)" }
  ],
  "comparisons": [
    { "label": "string", "leftLabel": "string", "leftValue": "string", "rightLabel": "string", "rightValue": "string", "sourceRef": "string (source id)" }
  ],
  "charts": [
    { "type": "bar | line | donut", "title": "string", "labels": ["string"], "values": [number], "sourceRef": "string (source id)" }
  ],
  "sources": [
    { "id": "string (short key like src1)", "name": "string", "url": "string (real URL)", "note": "string (what this source covers)" }
  ],
  "confidenceScore": number (0.0-1.0),
  "lastResearched": "string (today's date YYYY-MM-DD)"
}`;
