import { useState } from 'react';
import { Root, GlassNav } from '../../vendor/yanice-ds/yanice-ds.js';
import Dashboard from './Dashboard';
import ProjectView from './ProjectView';

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'project', label: 'Project' },
];

/**
 * The two views and the nav that switches them.
 *
 * Dashboard is one screen and does not scroll. Project is a horizontal band.
 * The two layouts are deliberately different — the switch is meant to be a
 * change of shape, not a crossfade of the same grid.
 *
 * Note the consequence for the glass nav: over the static Dashboard it is very
 * quiet, while in Project real content passes beneath it and it comes alive.
 * That inconsistency is still an open question.
 */
export default function Shell() {
  const [view, setView] = useState('dashboard');

  return (
    <Root>
      <main
        style={{
          minHeight: '100vh',
          padding: 'clamp(16px, 3vw, 48px)',
          paddingBottom: 96,
          display: 'grid',
          alignContent: view === 'dashboard' ? 'center' : 'start',
        }}
      >
        {view === 'dashboard' ? <Dashboard /> : <ProjectView />}
      </main>

      <GlassNav tabs={TABS} activeId={view} onChange={setView} />
    </Root>
  );
}
