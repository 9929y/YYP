import { workProjects, publicUrl } from '../data/projects';

export function GET() {
  const cards = workProjects().map((project) => ({
    slug: project.slug,
    href: project.href ? publicUrl(project.href) : null,
    cover: publicUrl(project.cover?.src ?? project.video?.poster ?? ''),
    title: project.headline ? `${project.title} · ${project.headline}` : project.title,
    sub: project.scope,
    note: project.note,
    status: project.status,
    unavailable: !project.href
  }));

  return new Response(JSON.stringify({ cards }), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=300'
    }
  });
}
