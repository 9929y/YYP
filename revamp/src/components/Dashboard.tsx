import {
  Bento,
  BentoCell,
  Surface,
  Text,
  AccentDot,
  Pill,
} from '../../vendor/yanice-ds/yanice-ds.js';

/**
 * Placeholder cell. Three cells are decided; the rest of the Dashboard
 * inventory is still open, so those slots hold their shape without
 * pretending to be content.
 */
function Placeholder({ hint }: { hint: string }) {
  return (
    <Surface style={{ height: '100%', display: 'grid', placeItems: 'center' }}>
      <Text size="sm" tone="dim">{hint}</Text>
    </Surface>
  );
}

export default function Dashboard() {
  return (
    <Bento columns={4}>
      {/* ── Decided: intro, 2×2, with the site's one accent mark ── */}
      <BentoCell w={2} h={2}>
        <Surface style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AccentDot label="Open to new work" />
            <Text size="sm" tone="dim" as="span">Open to new work</Text>
          </div>

          <Text size="xl" style={{ marginTop: 'auto' }}>Yanice Yang</Text>
          <Text size="lg" tone="dim" style={{ marginTop: 4 }}>UX Designer</Text>
          <Text size="base" tone="dim" style={{ marginTop: 16, maxWidth: '38ch' }}>
            Five years designing fashion, then a six-figure business of my own,
            then UX. I design products now.
          </Text>

          <div style={{ display: 'flex', gap: 6, marginTop: 20, flexWrap: 'wrap' }}>
            {['UX Research', 'Product Design', 'Design Systems'].map((t) => (
              <Pill key={t}>{t}</Pill>
            ))}
          </div>
        </Surface>
      </BentoCell>

      {/* ── Decided: résumé ── */}
      <BentoCell w={2}>
        <Surface
          as="a"
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          {...({ href: '/resume' } as any)}
          style={{
            height: '100%',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            textDecoration: 'none',
          }}
        >
          <Text size="lg" as="span">Résumé</Text>
          <Text size="sm" tone="dim" as="span">PDF ↗</Text>
        </Surface>
      </BentoCell>

      {/* ── Decided: contact ── */}
      <BentoCell w={2}>
        <Surface style={{ height: '100%' }}>
          <Text size="sm" tone="dim">Contact</Text>
          <div style={{ display: 'grid', gap: 6, marginTop: 12 }}>
            {[
              ['Email', 'yaniceydesign@gmail.com'],
              ['LinkedIn', 'in/yaniceyang'],
            ].map(([label, value]) => (
              <div
                key={label}
                style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}
              >
                <Text size="sm" as="span">{label}</Text>
                <Text size="sm" tone="dim" as="span">{value}</Text>
              </div>
            ))}
          </div>
        </Surface>
      </BentoCell>

      {/* ── Open: inventory not decided yet ── */}
      <BentoCell w={2}>
        <Placeholder hint="open slot" />
      </BentoCell>
      <BentoCell w={2}>
        <Placeholder hint="open slot" />
      </BentoCell>
    </Bento>
  );
}
