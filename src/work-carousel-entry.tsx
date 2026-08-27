import { createRoot, type Root } from 'react-dom/client';
import { ProjectsCarousel3D } from './components/islands/ProjectsCarousel3D';
import { hubProjects, publicUrl } from './data/projects';
import projectsCss from './styles/projects.css?inline';
import workCss from '../assets/css/yy-work.css?inline';

type HostElement = HTMLElement & { __yyWorkRoot?: Root };

function ensureStyles(host: HTMLElement) {
  if (host.querySelector('#yy-work-carousel-styles')) return;
  const style = document.createElement('style');
  style.id = 'yy-work-carousel-styles';
  /* Must live in the yy-nav shadow tree — document <head> styles do not pierce. */
  style.textContent = `${projectsCss}\n${workCss}`;
  host.prepend(style);
}

function cardsFromHub() {
  return hubProjects().map((project, index) => {
    const coverSrc = project.cover?.src ?? project.video?.poster;
    return {
      id: project.slug,
      title: project.title,
      scope: project.scope,
      tone: index,
      coverSrc: coverSrc ? publicUrl(coverSrc) : undefined,
      coverAlt: project.cover?.alt ?? project.title
    };
  });
}

function mountCarousel(host: HostElement) {
  if (host.__yyWorkRoot) return;
  ensureStyles(host);
  host.classList.add('yy-work-host');
  const mount = document.createElement('div');
  mount.className = 'yy-work-host__stage';
  host.appendChild(mount);
  const root = createRoot(mount);
  host.__yyWorkRoot = root;
  root.render(
    <ProjectsCarousel3D cards={cardsFromHub()} embed="panel" />
  );
}

class YYWorkContent extends HTMLElement {
  connectedCallback() {
    mountCarousel(this as HostElement);
  }

  disconnectedCallback() {
    const host = this as HostElement;
    if (host.__yyWorkRoot) {
      host.__yyWorkRoot.unmount();
      delete host.__yyWorkRoot;
    }
  }
}

if (typeof window !== 'undefined' && window.customElements) {
  if (!customElements.get('yy-work-content')) {
    customElements.define('yy-work-content', YYWorkContent);
  }
}
