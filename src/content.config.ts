import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const media = z.object({
  src: z.string().startsWith('/assets/'),
  alt: z.string().default(''),
  width: z.number().optional(),
  height: z.number().optional()
});

const video = z.object({
  src: z.string().startsWith('/assets/'),
  poster: z.string().startsWith('/assets/').optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  label: z.string().optional()
});

/**
 * One entry per case study. The Markdown body is the copy extracted from the
 * Webflow export (headings, paragraphs, image and video references). The
 * frontmatter is the curated metadata the landing / work index read.
 */
const cases = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/cases' }),
  schema: z.object({
    slug: z.string(),
    title: z.string(),
    headline: z.string().optional(),
    scope: z.string(),
    note: z.string(),
    description: z.string().optional(),
    status: z.enum(['published', 'in-progress']),
    theme: z.enum(['light', 'dark']).default('light'),
    order: z.number(),
    featured: z.boolean().default(false),
    logo: media.optional(),
    cover: media.optional(),
    video: video.optional(),
    source: z
      .object({
        legacyFile: z.string().optional(),
        webflowPageId: z.string().optional(),
        legacyTitle: z.string().optional()
      })
      .optional()
  })
});

const link = z.object({ label: z.string(), href: z.string() });

/**
 * Non-case pages. Structured copy (hero, resume data, work cards) lives in
 * frontmatter so the new UI can lay it out freely; long-form prose stays in
 * the Markdown body.
 */
const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    source: z.record(z.string(), z.string()).optional(),

    /* home */
    hero: z
      .object({
        eyebrow: z.string(),
        meta: z.array(z.string()),
        kicker: z.string(),
        statement: z.object({
          lead: z.string(),
          pairs: z.array(z.object({ beyond: z.string(), toward: z.string() })),
          accessible: z.string()
        }),
        canvasStill: z.string().optional()
      })
      .optional(),
    featuredLabel: z.string().optional(),

    /* about (rendered by the About nav panel and /about) */
    about: z
      .object({
        place: z.string(),
        hello: z.string(),
        name: z.string(),
        lead: z.string(),
        linkedin: z.string(),
        portrait: z.object({ src: z.string(), alt: z.string() }),
        aurora: z.string().optional(),
        bio: z.array(z.string()),
        funFact: z.object({ title: z.string(), text: z.string() }).optional(),
        cta: z.object({ label: z.string(), href: z.string() }).optional(),
        storiesTitle: z.string(),
        stories: z.array(
          z.object({
            title: z.string(),
            images: z.array(z.object({ src: z.string(), alt: z.string() })),
            /** Trusted HTML authored in the content file (<strong>, <br>). */
            html: z.string()
          })
        )
      })
      .optional(),

    /* work */
    cards: z
      .array(
        z.object({
          href: z.string().nullable(),
          title: z.string(),
          subtitle: z.string(),
          cover: z.string(),
          coverPosition: z.string().optional(),
          comingSoon: z.boolean().default(false)
        })
      )
      .optional(),

    /* resume */
    profile: z
      .object({
        name: z.string(),
        role: z.string(),
        location: z.string(),
        email: z.string(),
        linkedin: z.string()
      })
      .optional(),
    workRange: z.string().optional(),
    jobs: z
      .array(
        z.object({
          company: z.string(),
          url: z.string(),
          role: z.string(),
          date: z.string(),
          type: z.string(),
          location: z.string().optional(),
          summary: z.string(),
          highlights: z.array(z.string())
        })
      )
      .optional(),
    education: z.array(z.object({ school: z.string(), degree: z.string(), detail: z.string() })).optional(),
    awards: z
      .array(z.object({ name: z.string(), tier: z.string(), note: z.string(), url: z.string().optional() }))
      .optional(),
    publications: z.array(z.object({ title: z.string(), publisher: z.string(), url: z.string() })).optional(),
    skills: z.array(z.object({ category: z.string(), items: z.array(z.string()) })).optional()
  })
});

export const collections = { cases, pages };
export type NavLink = z.infer<typeof link>;
