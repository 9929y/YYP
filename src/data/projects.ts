/**
 * Landing-page view of the case studies.
 *
 * The words and metadata live in `src/content/cases/*.md`; this module only
 * reshapes them into the `Project` shape the landing components were written
 * against (ProjectIndex / ProjectSlot / SlotMedia), so those components did
 * not have to change when the data moved from a TypeScript array to content
 * collections.
 */
import { getCollection, type CollectionEntry } from 'astro:content';

export type ProjectStatus = 'published' | 'in-progress';
export type ProjectKind = 'slot' | 'panel' | 'gallery';
export type ProjectTheme = 'light' | 'dark';

export interface ProjectCover {
  src: string;
  alt: string;
  width?: number;
  height?: number;
}

export interface ProjectVideo {
  src: string;
  /** Optional VP9 source offered first via <source type="video/webm">. */
  webm?: string;
  poster?: string;
  width?: number;
  height?: number;
  label?: string;
  /** scroll = play when in view; hover = play on pointer enter; auto = muted autoplay on load. */
  play?: 'hover' | 'scroll' | 'auto';
}

export interface ProjectLogo {
  src: string;
  alt: string;
  width?: number;
  height?: number;
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
  kind: ProjectKind;
  theme: ProjectTheme;
  order: number;
  featured: boolean;
  description?: string;
  logo?: ProjectLogo;
  cover?: ProjectCover;
  video?: ProjectVideo;
  acts?: string[];
  panelFoot?: string;
}

export function publicUrl(src: string | null | undefined): string {
  if (!src) return '';
  if (/^https?:\/\//.test(src) || src.startsWith('mailto:')) return src;
  return src.startsWith('/') ? src : `/${src}`;
}

export function caseHref(slug: string): string {
  return `/work/${slug}`;
}

export function toProject(entry: CollectionEntry<'cases'>): Project {
  const d = entry.data;
  return {
    slug: d.slug,
    title: d.title,
    headline: d.headline,
    href: d.status === 'published' ? caseHref(d.slug) : null,
    scope: d.scope,
    note: d.note,
    status: d.status,
    kind: d.slug === 'fashion' ? 'gallery' : 'slot',
    theme: d.theme,
    order: d.order,
    featured: d.featured,
    description: d.description,
    logo: d.logo,
    cover: d.cover,
    video: d.video ? { ...d.video, play: 'scroll' } : undefined
  };
}

export async function allProjects(): Promise<Project[]> {
  const entries = await getCollection('cases');
  return entries.map(toProject).sort((a, b) => a.order - b.order);
}

export async function landingProjects(): Promise<Project[]> {
  return (await allProjects()).filter((p) => p.featured);
}

export async function getProject(slug: string): Promise<Project | undefined> {
  return (await allProjects()).find((p) => p.slug === slug);
}
