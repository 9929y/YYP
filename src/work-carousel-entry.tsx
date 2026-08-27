import { createRoot, type Root } from 'react-dom/client';
import { ProjectsCarousel3D } from './components/islands/ProjectsCarousel3D';
import { hubProjects, publicUrl } from './data/projects';
import projectsCss from './styles/projects.css?inline';
import workCss from '../assets/css/yy-work.css?inline';

type HostElement = HTMLElement & {
  __yyWorkRoot?: Root;
  __yyIntroKey?: number;
  __yyPanelListener?: (event: Event) => void;
};

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
      coverAlt: project.cover?.alt ?? project.title,
      href: project.href ? publicUrl(project.href) : null
    };
  });
}

function isWorkViewVisible(host: HTMLElement) {
  const view = host.closest('[data-panel-view="work"]') as HTMLElement | null;
  return Boolean(view && !view.hidden);
}

function renderCarousel(host: HostElement) {
  ensureStyles(host);
  host.classList.add('yy-work-host');

  let mount = host.querySelector('.yy-work-host__stage') as HTMLElement | null;
  if (!mount) {
    mount = document.createElement('div');
    mount.className = 'yy-work-host__stage';
    host.appendChild(mount);
  }

  if (!host.__yyWorkRoot) {
    host.__yyWorkRoot = createRoot(mount);
  }

  const introKey = host.__yyIntroKey ?? 0;
  host.__yyWorkRoot.render(
    <ProjectsCarousel3D
      cards={cardsFromHub()}
      embed="panel"
      introKey={introKey}
    />
  );
}

function playEntrance(host: HostElement) {
  if (!host.__yyWorkRoot) {
    host.__yyIntroKey = 0;
    renderCarousel(host);
    return;
  }
  host.__yyIntroKey = (host.__yyIntroKey ?? 0) + 1;
  renderCarousel(host);
}

function mountCarousel(host: HostElement) {
  host.__yyIntroKey = host.__yyIntroKey ?? 0;

  if (!host.__yyPanelListener) {
    host.__yyPanelListener = (event: Event) => {
      const detail = (
        event as CustomEvent<{ open?: boolean; panel?: string }>
      ).detail;
      if (!detail?.open) return;
      if (detail.panel && detail.panel !== 'work') return;
      // After panel morph (~520ms) so fan-out is visible in the popup.
      window.setTimeout(() => playEntrance(host), 300);
    };
    window.addEventListener('yy:panel-state', host.__yyPanelListener);
  }

  // Script often loads during first Work open — start if already visible.
  if (isWorkViewVisible(host)) {
    window.setTimeout(() => playEntrance(host), 120);
  }
}

function unmountCarousel(host: HostElement) {
  if (host.__yyPanelListener) {
    window.removeEventListener('yy:panel-state', host.__yyPanelListener);
    delete host.__yyPanelListener;
  }
  if (host.__yyWorkRoot) {
    host.__yyWorkRoot.unmount();
    delete host.__yyWorkRoot;
  }
}

class YYWorkContent extends HTMLElement {
  connectedCallback() {
    mountCarousel(this as HostElement);
  }

  disconnectedCallback() {
    unmountCarousel(this as HostElement);
  }
}

if (typeof window !== 'undefined' && window.customElements) {
  if (!customElements.get('yy-work-content')) {
    customElements.define('yy-work-content', YYWorkContent);
  }
}
