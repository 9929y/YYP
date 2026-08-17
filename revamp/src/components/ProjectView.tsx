import { Card, Text } from '../../vendor/yanice-ds/yanice-ds.js';

/**
 * The four to five main cases that survived the content-plan convergence.
 * `href` still points at the existing Webflow pages — case-page layout has no
 * decisions yet, so those pages are deliberately untouched for now.
 */
const WORK = [
  { title: 'AtlasNova', meta: 'Product · Agents · Shipped', href: '#' },
  { title: 'Lark Design', meta: '1:1 Interviews · Onboarding', href: '/larkdesign.html' },
  { title: 'Opus Clip', meta: '0→1 · 6M users', href: '/ai-driven-product-design.html' },
  { title: 'McKinsey Ecommerce', meta: 'Strategy · Commerce', href: '/mckinseyecommerce.html' },
  { title: 'MiFinance', meta: 'Onboarding · Fintech', href: '/mifinance.html' },
];

export default function ProjectView() {
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Text size="sm" tone="dim">Selected work</Text>

      {/*
        Horizontal scroll, per the s-card decision. Native scrolling rather than
        a virtualised/inertial one: an inertia layer would feel closer to the
        reference site but breaks the scrollbar, keyboard scrolling, and screen
        readers — and accessibility was an explicit requirement.
        Cards overhang their box when tilted, so the track has vertical slack.
      */}
      <div
        style={{
          display: 'grid',
          gridAutoFlow: 'column',
          // Fixed track width, not minmax: with minmax the grid shrank every
          // card to its minimum so five of them exactly fit 1440px and the rail
          // never scrolled. A fixed column means the rail overflows precisely
          // when there is more work than fits — which is the signal it exists for.
          gridAutoColumns: 'clamp(220px, 24vw, 320px)',
          gap: 24,
          overflowX: 'auto',
          overflowY: 'hidden',
          paddingBottom: 24,
          paddingTop: 24,
          scrollSnapType: 'x proximity',
        }}
      >
        {WORK.map((w) => (
          <div key={w.title} style={{ scrollSnapAlign: 'start' }}>
            <Card title={w.title} meta={w.meta} href={w.href} />
          </div>
        ))}
      </div>
    </div>
  );
}
