export type ProjectStatus = 'published' | 'in-progress';
export type ProjectEngine = 'webflow' | 'astro';
export type ProjectKind = 'slot' | 'panel' | 'gallery';
export type ProjectTheme = 'light' | 'dark';

export interface ProjectCover {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export interface ProjectVideo {
  src: string;
  /** Optional still shown before play. Prefer a real frame when available. */
  poster?: string;
  width: number;
  height: number;
  label: string;
  /** scroll = play when in view (landing default); hover = play on pointer enter. */
  play?: 'hover' | 'scroll';
}

export interface Project {
  slug: string;
  title: string;
  /** Public URL. Null when the page does not exist yet. */
  href: string | null;
  scope: string;
  note: string;
  status: ProjectStatus;
  engine: ProjectEngine;
  kind: ProjectKind;
  theme: ProjectTheme;
  featuredOnLanding: boolean;
  featuredOnIndex: boolean;
  featuredOnProjects: boolean;
  landingOrder: number;
  /** SEO description; falls back to `note`. */
  description?: string;
  cover?: ProjectCover;
  video?: ProjectVideo;
  placeholderFile?: string;
  placeholderSpec?: string;
  acts?: string[];
  panelFoot?: string;
  /** Explicit Webflow footer neighbours. New Astro pages may omit these. */
  prevSlug?: string;
  nextSlug?: string;
}

export const projects: Project[] = [
  {
    slug: 'atlasnova',
    title: 'AtlasNova',
    href: null,
    scope: 'Product Design · Design Systems',
    note: 'In progress. Brand kit input flows while the case study is written.',
    status: 'in-progress',
    engine: 'astro',
    kind: 'slot',
    theme: 'light',
    featuredOnLanding: true,
    featuredOnIndex: false,
    featuredOnProjects: false,
    landingOrder: 1,
    video: {
      src: 'assets/videos/case-atlasnova.mp4',
      width: 1440,
      height: 1080,
      label: 'AtlasNova brand kit input cover',
      play: 'scroll'
    },
    placeholderFile: 'videos/case-atlasnova.mp4',
    placeholderSpec: '4:3 · plays in view'
  },
  {
    slug: 'larkdesign',
    title: 'Lark Design',
    href: 'larkdesign.html',
    scope: 'User Research',
    note: 'One-to-one interviews driving an onboarding rebuild.',
    status: 'published',
    engine: 'webflow',
    kind: 'slot',
    theme: 'light',
    featuredOnLanding: true,
    featuredOnIndex: true,
    featuredOnProjects: true,
    landingOrder: 3,
    cover: {
      src: 'assets/images/home/hero-lark-onboarding-card-cover.webp',
      alt: 'Lark Design onboarding case study',
      width: 492,
      height: 369
    },
    video: {
      src: 'assets/videos/case-lark.mp4',
      poster: 'assets/images/home/hero-lark-onboarding-card-cover.webp',
      width: 1440,
      height: 1080,
      label: 'Lark Design carousel preview',
      play: 'scroll'
    },
    placeholderFile: 'videos/case-lark.mp4',
    placeholderSpec: '4:3 · plays in view',
    prevSlug: 'mckinseyecommerce',
    nextSlug: 'cummins-digitalization'
  },
  {
    slug: 'ai-driven-product-design',
    title: 'Opus Clip',
    href: 'ai-driven-product-design.html',
    scope: 'Consumer Product · 0 → 1',
    note: 'AI video editing, from a prompt to a finished cut.',
    description: 'AI-driven product design for Opus Clip, from a prompt to a finished cut.',
    status: 'published',
    engine: 'webflow',
    kind: 'slot',
    theme: 'dark',
    featuredOnLanding: true,
    featuredOnIndex: true,
    featuredOnProjects: true,
    landingOrder: 2,
    video: {
      src: 'assets/videos/case-opusclip-marquee.mp4',
      poster: 'assets/images/home/case-opusclip.jpg',
      width: 1440,
      height: 1080,
      label: 'Opus Clip marquee preview',
      play: 'scroll'
    },
    placeholderFile: 'videos/case-opusclip-marquee.mp4',
    placeholderSpec: '4:3 · plays in view',
    prevSlug: 'alzheimerdisease',
    nextSlug: 'mckinseyecommerce'
  },
  {
    slug: 'mckinseyecommerce',
    title: 'McKinsey Ecommerce',
    href: 'mckinseyecommerce.html',
    scope: 'Strategy & Ecommerce',
    note: 'The longest write-up here, and the one with the most argument in it.',
    status: 'published',
    engine: 'webflow',
    kind: 'slot',
    theme: 'light',
    featuredOnLanding: true,
    featuredOnIndex: true,
    featuredOnProjects: true,
    landingOrder: 4,
    cover: {
      src: 'assets/images/home/hero-mckinsey-ecommerce-card-cover.webp',
      alt: 'McKinsey live-streamed ecommerce case study',
      width: 492,
      height: 369
    },
    video: {
      src: 'assets/videos/case-mckinsey.mp4',
      poster: 'assets/images/home/hero-mckinsey-ecommerce-card-cover.webp',
      width: 1440,
      height: 1080,
      label: 'McKinsey orbit preview',
      play: 'scroll'
    },
    placeholderFile: 'videos/case-mckinsey.mp4',
    placeholderSpec: '4:3 · plays in view',
    prevSlug: 'ai-driven-product-design',
    nextSlug: 'larkdesign'
  },
  {
    slug: 'mifinance',
    title: 'MiFinance',
    href: 'mifinance.html',
    scope: 'Interaction & Craft',
    note: 'Account flows where the detail is the point.',
    status: 'published',
    engine: 'webflow',
    kind: 'slot',
    theme: 'light',
    featuredOnLanding: true,
    featuredOnIndex: true,
    featuredOnProjects: true,
    landingOrder: 5,
    cover: {
      src: 'assets/images/home/case-mifinance.webp',
      alt: 'MiFinance account flows case study',
      width: 492,
      height: 369
    },
    placeholderFile: 'home/case-mifinance.webp',
    placeholderSpec: '4:3 · export 984 × 738',
    prevSlug: 'cummins-digitalization',
    nextSlug: 'alzheimerdisease'
  },
  {
    slug: 'cummins-digitalization',
    title: 'Cummins',
    href: 'cummins-digitalization.html',
    scope: 'Enterprise · Digitalization',
    note: 'Service tooling for people who use it all day.',
    status: 'published',
    engine: 'webflow',
    kind: 'slot',
    theme: 'light',
    featuredOnLanding: true,
    featuredOnIndex: true,
    featuredOnProjects: true,
    landingOrder: 6,
    cover: {
      src: 'assets/images/home/case-cummins.webp',
      alt: 'Cummins service tooling case study',
      width: 492,
      height: 369
    },
    placeholderFile: 'home/case-cummins.webp',
    placeholderSpec: '4:3 · export 984 × 738',
    prevSlug: 'larkdesign',
    nextSlug: 'mifinance'
  },
  {
    slug: 'alzheimerdisease',
    title: 'Medical Assistive',
    href: 'alzheimerdisease.html',
    scope: 'Health · Wearable',
    note: 'A wearable for care, designed around the carer as much as the patient.',
    status: 'published',
    engine: 'webflow',
    kind: 'slot',
    theme: 'dark',
    featuredOnLanding: true,
    featuredOnIndex: true,
    featuredOnProjects: true,
    landingOrder: 7,
    cover: {
      src: 'assets/images/home/case-medical.webp',
      alt: 'Medical assistive wearable case study',
      width: 492,
      height: 369
    },
    placeholderFile: 'home/case-medical.webp',
    placeholderSpec: '4:3 · export 984 × 738',
    prevSlug: 'mifinance',
    nextSlug: 'mckinseyecommerce'
  },
  {
    slug: 'tiktok-research',
    title: 'TikTok Research',
    href: 'tiktok-research.html',
    scope: 'Quantitative research & analysis',
    note: 'Global platform research case study.',
    status: 'published',
    engine: 'webflow',
    kind: 'slot',
    theme: 'light',
    featuredOnLanding: false,
    featuredOnIndex: false,
    featuredOnProjects: true,
    landingOrder: 80,
    prevSlug: undefined,
    nextSlug: undefined
  },
  {
    slug: 'fashion',
    title: 'Fashion',
    href: 'fashion.html',
    scope: 'Gallery',
    note: 'Fashion work, linked from About and the shared footer.',
    status: 'published',
    engine: 'webflow',
    kind: 'gallery',
    theme: 'light',
    featuredOnLanding: false,
    featuredOnIndex: false,
    featuredOnProjects: false,
    landingOrder: 90
  }
];

const SLUG = new Map(projects.map((p) => [p.slug, p]));

export function publicUrl(src: string | null | undefined): string {
  if (!src) return '';
  if (/^https?:\/\//.test(src) || src.startsWith('mailto:')) return src;
  return src.startsWith('/') ? src : `/${src}`;
}

export function diskPath(src: string): string {
  return src.replace(/^\//, '');
}

export function getProject(slug: string | undefined): Project | undefined {
  return slug ? SLUG.get(slug) : undefined;
}

export function landingProjects(): Project[] {
  return projects
    .filter((p) => p.featuredOnLanding)
    .sort((a, b) => a.landingOrder - b.landingOrder);
}

export function astroCaseStudies(): Project[] {
  return projects.filter((p) => p.engine === 'astro' && p.status === 'published' && p.href);
}

export function neighbors(slug: string): { prev?: Project; next?: Project } {
  const project = getProject(slug);
  if (!project) return {};
  return {
    prev: project.prevSlug ? getProject(project.prevSlug) : undefined,
    next: project.nextSlug ? getProject(project.nextSlug) : undefined
  };
}

export function validateProjects(): string[] {
  const errors: string[] = [];
  const slugs = new Set<string>();
  for (const p of projects) {
    if (!p.slug) errors.push('project missing slug');
    if (slugs.has(p.slug)) errors.push(`duplicate slug: ${p.slug}`);
    slugs.add(p.slug);
    if (p.status === 'published' && p.kind !== 'panel' && !p.href) {
      errors.push(`${p.slug}: published project needs href`);
    }
    if (p.href && !p.href.endsWith('.html')) {
      errors.push(`${p.slug}: href must be a flat .html URL`);
    }
    if (p.prevSlug && !SLUG.has(p.prevSlug)) errors.push(`${p.slug}: unknown prevSlug ${p.prevSlug}`);
    if (p.nextSlug && !SLUG.has(p.nextSlug)) errors.push(`${p.slug}: unknown nextSlug ${p.nextSlug}`);
    if (p.kind === 'slot' && p.featuredOnLanding && !p.cover && !p.video) {
      errors.push(`${p.slug}: landing slot needs cover or video`);
    }
    if (p.kind === 'panel' && (!p.acts || p.acts.length === 0)) {
      errors.push(`${p.slug}: panel needs acts`);
    }
  }
  return errors;
}
