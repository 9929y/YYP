import type { ProjectCover, ProjectVideo } from './projects.ts';

export interface CaseStudyMeta {
  overview: string;
  role: string;
  timeline: string;
}

export interface CaseStudyMedia {
  type: 'image' | 'video';
  src: string;
  alt?: string;
  poster?: string;
  label?: string;
  width?: number;
  height?: number;
  caption?: string;
}

export interface CaseStudySection {
  id: string;
  eyebrow: string;
  title: string;
  body: string[];
  media?: CaseStudyMedia[];
}

export interface CaseStudyQuote {
  quote: string;
  attribution: string;
}

export interface CaseStudyStat {
  value: string;
  label: string;
}

export interface CaseStudyContent {
  meta: CaseStudyMeta;
  sections: CaseStudySection[];
  quote?: CaseStudyQuote;
  stats?: CaseStudyStat[];
  media?: CaseStudyMedia[];
}

export const caseStudies: Record<string, CaseStudyContent> = {
  atlasnova: {
    meta: {
      overview: 'A reusable Astro case-study draft for AtlasNova, grounded in the current landing card metadata and existing media assets.',
      role: 'Product design, product strategy, AI workflow design',
      timeline: 'In progress'
    },
    sections: [
      {
        id: 'context',
        eyebrow: '01',
        title: 'Context',
        body: [
          'AtlasNova explores how small and midsize businesses can build a stronger visual language across marketing assets with AI-guided brand discovery.',
          'This draft keeps the future case study on the new Astro structure while the detailed project narrative is still being shaped.'
        ]
      },
      {
        id: 'process',
        eyebrow: '02',
        title: 'Process',
        body: [
          'The case-study structure is ready to capture problem framing, product decisions, media evidence, measurable outcomes, and reflection in one consistent pattern.',
          'Existing videos, covers, logos, and project metadata remain reusable so the visual revamp can happen without breaking the public portfolio routes.'
        ],
        media: [
          {
            type: 'video',
            src: 'assets/videos/case-atlasnova.mp4',
            poster: 'assets/images/home/case-atlasnova-frame.jpg',
            label: 'AtlasNova brand kit workflow preview',
            width: 1440,
            height: 1080,
            caption: 'Current AtlasNova preview asset, ready to become the evidence module for the full case study.'
          }
        ]
      },
      {
        id: 'next',
        eyebrow: '03',
        title: 'Next',
        body: [
          'The next content pass can replace this draft copy with the full case narrative while keeping layout, SEO metadata, navigation, and media treatment shared across every Astro case.'
        ]
      }
    ],
    quote: {
      quote: 'Keep the structure stable; let each project bring its own evidence.',
      attribution: 'Case study system principle'
    },
    stats: [
      { value: '1', label: 'Reusable case-study structure' },
      { value: '0', label: 'Published placeholder modules' }
    ]
  }
};

export function getCaseStudyContent(slug: string | undefined): CaseStudyContent | undefined {
  return slug ? caseStudies[slug] : undefined;
}

export function hasCaseStudyContent(slug: string | undefined): boolean {
  return !!getCaseStudyContent(slug);
}

export function mediaFromProject(media: ProjectVideo | ProjectCover | undefined): CaseStudyMedia | undefined {
  if (!media) return undefined;
  if ('label' in media) {
    return {
      type: 'video',
      src: media.src,
      poster: media.poster,
      label: media.label,
      width: media.width,
      height: media.height
    };
  }
  return {
    type: 'image',
    src: media.src,
    alt: media.alt,
    width: media.width,
    height: media.height
  };
}
