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
  /** scroll = play when in view; hover = play on pointer enter; auto = muted autoplay on load. */
  play?: 'hover' | 'scroll' | 'auto';
}

export interface ProjectLogo {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export interface Project {
  slug: string;
  title: string;
  /** Landing display headline; falls back to `title`. */
  headline?: string;
  /** Public URL. Null when the page does not exist yet. */
  href: string | null;
  scope: string;
  note: string;
  status: ProjectStatus;
  engine: ProjectEngine;
  kind: ProjectKind;
  theme: ProjectTheme;
  featuredOnLanding: boolean;
  /** Reserved for a future Astro index page; only `featuredOnLanding` is read today. */
  featuredOnIndex: boolean;
  /** Reserved for `projects.html` migration; only `featuredOnLanding` is read today. */
  featuredOnProjects: boolean;
  landingOrder: number;
  /** SEO description; falls back to `note`. */
  description?: string;
  logo?: ProjectLogo;
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
    slug: 'ai-driven-product-design',
    title: 'Opus Clip',
    headline: 'Video Creation Beyond Prompts',
    href: 'ai-driven-product-design.html',
    scope: 'Web-based AI SaaS',
    note: 'Turning prompt-based generation into an intent-led video workflow',
    description: 'AI-driven product design for Opus Clip, from a prompt to a finished cut.',
    status: 'published',
    engine: 'webflow',
    kind: 'slot',
    theme: 'dark',
    featuredOnLanding: true,
    featuredOnIndex: true,
    featuredOnProjects: true,
    landingOrder: 1,
    logo: {
      src: 'assets/images/brands/logo-opusclip.svg',
      alt: 'OpusClip',
      width: 135,
      height: 24
    },
    video: {
      src: 'assets/videos/case-opusclip-marquee.mp4',
      poster: 'assets/images/home/case-opusclip.jpg',
      width: 1440,
      height: 1080,
      label: 'Opus Clip marquee preview',
      play: 'auto'
    },
    placeholderFile: 'videos/case-opusclip-marquee.mp4',
    placeholderSpec: '4:3 · autoplay',
    prevSlug: 'alzheimerdisease',
    nextSlug: 'mckinseyecommerce'
  },
  {
    slug: 'atlasnova',
    title: 'AtlasNova',
    headline: 'AI-Guided Brand Discovery',
    href: null,
    scope: 'Web App',
    note: 'Designing a brand kit that helps SMB build up visual language across marketing assets',
    status: 'in-progress',
    engine: 'astro',
    kind: 'slot',
    theme: 'light',
    featuredOnLanding: true,
    featuredOnIndex: false,
    featuredOnProjects: false,
    landingOrder: 2,
    logo: {
      src: 'assets/images/brands/logo-atlasnova.svg',
      alt: 'AtlasNova',
      width: 133,
      height: 24
    },
    video: {
      src: 'assets/videos/case-atlasnova.mp4',
      poster: 'assets/images/home/case-atlasnova.jpg',
      width: 1440,
      height: 1080,
      label: 'AtlasNova brand kit input cover',
      play: 'scroll'
    },
    placeholderFile: 'videos/case-atlasnova.mp4',
    placeholderSpec: '4:3 · plays in view'
  },
  {
    slug: 'mckinseyecommerce',
    title: 'McKinsey Ecommerce',
    headline: 'Live shopping from 0 to\u00A01',
    href: 'mckinseyecommerce.html',
    scope: 'Mobile App',
    note: 'Helping an established organization build its first digital commerce business from the ground up.',
    status: 'published',
    engine: 'webflow',
    kind: 'slot',
    theme: 'light',
    featuredOnLanding: true,
    featuredOnIndex: true,
    featuredOnProjects: true,
    landingOrder: 3,
    logo: {
      src: 'assets/images/brands/logo-mckinsey.svg',
      alt: 'McKinsey Design',
      width: 97,
      height: 44
    },
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
      play: 'auto'
    },
    placeholderFile: 'videos/case-mckinsey.mp4',
    placeholderSpec: '4:3 · autoplay',
    prevSlug: 'ai-driven-product-design',
    nextSlug: 'larkdesign'
  },
  {
    slug: 'larkdesign',
    title: 'Lark Design',
    headline: 'Team onboarding in all-in-one office tool',
    href: 'larkdesign.html',
    scope: 'Web&Mobile App',
    note: 'Reducing information gaps in Lark’s collaboration experience',
    status: 'published',
    engine: 'webflow',
    kind: 'slot',
    theme: 'light',
    featuredOnLanding: true,
    featuredOnIndex: true,
    featuredOnProjects: true,
    landingOrder: 4,
    logo: {
      src: 'assets/images/brands/logo-bytedance.png',
      alt: 'ByteDance',
      width: 133,
      height: 22
    },
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
      play: 'auto'
    },
    placeholderFile: 'videos/case-lark.mp4',
    placeholderSpec: '4:3 · autoplay',
    prevSlug: 'mckinseyecommerce',
    nextSlug: 'cummins-digitalization'
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
    featuredOnLanding: false,
    featuredOnIndex: true,
    featuredOnProjects: true,
    landingOrder: 5,
    cover: {
      src: 'assets/images/home/hero-mi-finance-account-card-cover.webp',
      alt: 'MiFinance account flows case study',
      width: 492,
      height: 369
    },
    placeholderFile: 'home/hero-mi-finance-account-card-cover.webp',
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
    featuredOnLanding: false,
    featuredOnIndex: true,
    featuredOnProjects: true,
    landingOrder: 6,
    cover: {
      src: 'assets/images/home/hero-cummins-guidanz-card-cover.webp',
      alt: 'Cummins service tooling case study',
      width: 492,
      height: 369
    },
    placeholderFile: 'home/hero-cummins-guidanz-card-cover.webp',
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
    featuredOnLanding: false,
    featuredOnIndex: true,
    featuredOnProjects: true,
    landingOrder: 7,
    cover: {
      src: 'assets/images/home/hero-alzheimer-care-wearable-card-cover.webp',
      alt: 'Medical assistive wearable case study',
      width: 492,
      height: 369
    },
    placeholderFile: 'home/hero-alzheimer-care-wearable-card-cover.webp',
    placeholderSpec: '4:3 · export 984 × 738',
    prevSlug: 'mifinance',
    nextSlug: 'ai-driven-product-design'
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
