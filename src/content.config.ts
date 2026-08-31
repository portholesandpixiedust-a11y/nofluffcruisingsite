import { defineCollection, z } from 'astro:content';
import { glob, file } from 'astro/loaders';

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
  publishDate: z.coerce.date(),
  updatedDate: z.coerce.date().optional(),
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
    grossTonnage: z.number().optional(),
    updated: z.string().optional(),
  }),
});

const lines = defineCollection({
  loader: file('./src/data/lines.json'),
  schema: z.object({
    id: z.string(),
    name: z.string(),
    blurb: z.string(),
    loyaltyProgram: z.string().optional(),
  }),
});

export const collections = { reviews, guides, ships, lines };
