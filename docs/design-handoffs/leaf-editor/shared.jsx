// Shared content + helpers for the nudo editor direction explorations.
// Exported to window so each direction file can use them.
const { useState } = React;

// ── Sample manuscript ────────────────────────────────────────────────
// Original prose written for this mock (no third-party copyright).
const NOVEL = {
  project: 'Northwater',
  kind: 'Novel',
  totalWords: '84,210',
  author: 'E. Halloran',
  parts: [
    {
      label: 'Part I — The Dark Coast',
      chapters: [
        { n: 1, title: 'Salt and Iron', words: 3120, status: 'done' },
        { n: 2, title: 'The Long Tide', words: 4860, status: 'done' },
        { n: 3, title: 'The Tidewatch', words: 2540, status: 'drafting', active: true },
        { n: 4, title: 'What the Gulls Knew', words: 5210, status: 'edited' },
        { n: 5, title: 'Northwater', words: 1980, status: 'drafting' },
      ],
    },
    {
      label: 'Part II — The Keeper',
      chapters: [
        { n: 6, title: "The Keeper's Ledger", words: 4330, status: 'edited' },
        { n: 7, title: 'Below the Waterline', words: 3770, status: 'idea' },
        { n: 8, title: 'A Lamp for the Drowned', words: 2110, status: 'idea' },
      ],
    },
  ],
};

// Scenes for the active chapter (used by outline / spine).
const SCENES = [
  { title: 'The climb', words: 740 },
  { title: 'The lamp room', words: 980, active: true },
  { title: "Maren's promise", words: 820 },
];

// Prose of the active chapter "The Tidewatch".
const PROSE = [
  'The lighthouse had been dark for three winters before Maren agreed to climb it again. The town had stopped expecting the light by then — the fishermen learned the rocks the way they learned their own hands, and the children grew up believing the tower was only a chimney for the wind.',
  'She found the stairs exactly as she had left them: salt-eaten, patient, spiralling up into a cold that smelled of iron and old rain. Each step gave back the sound of her boots and kept the rest for itself.',
  'At the top, the lamp room held its breath. The great lens sat beneath its canvas like something sleeping, and beyond the glass the sea went on rehearsing the only sentence it knew.',
  'Maren set down the lantern. She had promised her father nothing, and she meant to keep that promise the way she kept all the others — badly, and for years.',
];

// ── Tiny stroke-icon set (lucide-flavoured) ──────────────────────────
const ICON_PATHS = {
  feather: 'M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5zM16 8 2 22M17.5 15H9',
  command: 'M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3Z',
  search: 'M11 17.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13ZM21 21l-4.3-4.3',
  plus: 'M12 5v14M5 12h14',
  check: 'M20 6 9 17l-5-5',
  chevron: 'm9 18 6-6-6-6',
  chevronDown: 'm6 9 6 6 6-6',
  message: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  bold: 'M6 4h8a4 4 0 0 1 0 8H6zM6 12h9a4 4 0 0 1 0 8H6z',
  italic: 'M19 4h-9M14 20H5M15 4 9 20',
  underline: 'M6 4v6a6 6 0 0 0 12 0V4M4 21h16',
  type: 'M4 7V4h16v3M9 20h6M12 4v16',
  quote: 'M3 21c3-1 4-3 4-7V5h6v8c0 4-2 7-6 8zM13 21c3-1 4-3 4-7V5h6v8c0 4-2 7-6 8z',
  highlighter: 'm9 11-6 6v3h3l6-6M9 11l8.5-8.5a2.1 2.1 0 0 1 3 3L12 14M9 11l3 3',
  align: 'M3 6h18M3 12h12M3 18h15',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2 2 2 0 0 1-4 0 1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 4.6 15a2 2 0 0 1 0-4 1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 2.9-1.2 2 2 0 0 1 4 0 1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.7 1.7 0 0 0 19.4 9a2 2 0 0 1 0 4Z',
  focus: 'M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2',
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
  pen: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
  layers: 'm12 2 9 5-9 5-9-5zM3 12l9 5 9-5M3 17l9 5 9-5',
  book: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5z',
  arrowRight: 'M5 12h14M13 5l7 7-7 7',
  sparkle: 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z',
  dot: 'M12 12m-3 0a3 3 0 1 0 6 0 3 3 0 1 0-6 0',
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z',
  logOut: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  trash: 'M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6',
  help: 'M12 17h.01M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3',
};

function Icon({ name, size = 16, stroke = 1.6, fill = 'none', style, className }) {
  const d = ICON_PATHS[name] || '';
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill={fill === 'current' ? 'currentColor' : 'none'}
      stroke="currentColor" strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round"
      style={style} className={className} aria-hidden="true"
    >
      {d.split('M').filter(Boolean).map((seg, i) => <path key={i} d={'M' + seg} />)}
    </svg>
  );
}

// nudo wordmark — lowercase editorial serif with a coloured period.
function Wordmark({ color = '#312D28', dot = '#3E7561', size = 22, weight = 600 }) {
  return (
    <span style={{
      fontFamily: "'Newsreader', Georgia, serif",
      fontWeight: weight, fontSize: size, letterSpacing: '-0.02em',
      color, lineHeight: 1, display: 'inline-flex', alignItems: 'baseline',
    }}>
      <span style={{ marginRight: '0.04em' }}>—</span>nudo<span style={{ color: dot }}>.</span>
    </span>
  );
}

// Avatar pill
function Avatar({ initials, bg = '#3E7561', size = 26, ring, style }) {
  return (
    <span style={{
      width: size, height: size, borderRadius: '50%', background: bg,
      color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.4, fontWeight: 600, fontFamily: 'inherit',
      boxShadow: ring ? `0 0 0 2px ${ring}` : 'none', flexShrink: 0, ...style,
    }}>{initials}</span>
  );
}

Object.assign(window, { NOVEL, SCENES, PROSE, Icon, Wordmark, Avatar });
