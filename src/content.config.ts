import { defineCollection, z } from 'astro:content';
import { glob, file } from 'astro/loaders';
import { normalizeContentDate } from './utils/etDate.js';

// Date-only frontmatter becomes noon America/New_York. Full timestamps are kept.
const contentDate = (required) => z.preprocess((val) => {
  if (val == null || val === '') return undefined;
  return normalizeContentDate(val);
}, required ? z.date() : z.date().optional());

const source = z.object({
  claim: z.string(),
  outlet: z.string(),
  tier: z.number().min(1).max(2),
  date: z.string().optional(),
  url: z.string().optional(),
  note: z.string().optional(),
});

const videoRef = z.object({ title: z.string(), id: z.string() });

const articleBase = {
  title: z.string(),
  heroImage: z.string().optional(),
  heroCredit: z.string().optional(),
  description: z.string(),
  answer: z.string(),
  presenter: z.enum(['Matthew', 'Marlee']).default('Matthew'),
  publishDate: contentDate(true),
  publishedAt: contentDate(false),
  updatedDate: contentDate(false),
  updatedAt: contentDate(false),
  line: z.string().optional(),
  ships: z.array(z.string()).default([]),
  topics: z.array(z.string()).default([]),
  sponsor: z.object({ name: z.string(), url: z.string(), blurb: z.string() }).optional(),
  sources: z.array(source).default([]),
  videosReferenced: z.array(videoRef).default([]),
  watchNext: videoRef.optional(),
};

const reviews = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/reviews' }),
  schema: z.object({
    ...articleBase,
    video: z.object({ id: z.string(), title: z.string(), duration: z.string().optional() }),
  }),
});

const guides = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/guides' }),
  schema: z.object({
    ...articleBase,
    video: z.object({ id: z.string(), title: z.string(), duration: z.string().optional() }).optional(),
    faq: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
  }),
});

const news = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/news' }),
  schema: z.object({
    ...articleBase,
    video: z.object({ id: z.string(), title: z.string(), duration: z.string().optional() }).optional(),
    tags: z.array(z.string()).default([]),
    sailing: z.string().min(1).optional(),
    itineraryChange: z.object({
      kinds: z.array(z.enum(['port-skip', 'delay', 'swap'])).min(1),
      ship: z.string().min(1),
      sailing: z.string().min(1),
      changed: z.string().min(1),
    }).optional(),
  }),
});

const ships = defineCollection({
  loader: file('./src/data/ships.json'),
  schema: z.object({
    id: z.string(),
    name: z.string(),
    line: z.string(),
    shipClass: z.string(),
    guests: z.number().optional(),
    maxGuests: z.number().optional(),
    grossTonnage: z.number().optional(),
    decks: z.number().optional(),
    inService: z.number().optional(),
    status: z.string().default('In service'),
    homePorts: z.array(z.string()).default([]),
    verdict: z.string().optional(),
    goodAt: z.array(z.string()).default([]),
    watchFor: z.array(z.string()).default([]),
    coveredIn: z.array(videoRef).default([]),
    videoTour: z.object({ id: z.string(), title: z.string(), channel: z.string() }).nullable().default(null),
    updated: z.string().optional(),
    sameAs: z.array(z.string().url()).default([]),
  }),
});

const lines = defineCollection({
  loader: file('./src/data/lines.json'),
  schema: z.object({
    id: z.string(),
    name: z.string(),
    blurb: z.string(),
    loyaltyProgram: z.string().optional(),
    sameAs: z.array(z.string().url()).default([]),
  }),
});

const cdcScores = defineCollection({
  loader: file('./src/data/cdc-scores.json'),
  schema: z.object({
    id: z.string(),
    ship: z.string(),
    line: z.string(),
    score: z.number().int().min(0).max(100),
    inspectionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
});

export const collections = { reviews, guides, news, ships, lines, cdcScores };
