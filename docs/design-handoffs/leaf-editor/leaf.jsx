// Direction 01 — "Leaf": editorial, outline-native navigation, no persistent toolbar.
const LEAF_THEMES = {
  light: {
    bg: '#F7F3EC', side: '#F1EADD', sideEdge: '#E6DCCB',
    ink: '#2A251F', prose: '#3D372E', muted: '#9A9286', faint: '#B8AF9F',
    accent: '#B0573C', accentSoft: 'rgba(176,87,60,0.12)',
    border: '#E5DCCC', track: '#E2D8C7', fill: '#C99A6F',
    sel: 'rgba(176,87,60,0.15)', comment: '#F2D58A', commentEdge: '#D9B65A',
    barShadow: '0 12px 34px -16px rgba(60,45,30,0.45)', pill: '#FFFCF6', pillEdge: '#E8DECC',
    done: '#6F9C82', dotEmpty: '#C7BCA8',
  },
  dark: {
    bg: '#221D17', side: '#1A1610', sideEdge: '#322B22',
    ink: '#EFE6D6', prose: '#DCD2C1', muted: '#8E867A', faint: '#6E665B',
    accent: '#D89164', accentSoft: 'rgba(216,145,100,0.16)',
    border: '#322B22', track: '#322B22', fill: '#8A6A4C',
    sel: 'rgba(216,145,100,0.20)', comment: 'rgba(242,213,138,0.26)', commentEdge: 'rgba(217,182,90,0.6)',
    barShadow: '0 16px 40px -18px rgba(0,0,0,0.7)', pill: '#2C261E', pillEdge: '#403729',
    done: '#7FAE91', dotEmpty: '#5A5246',
  },
};

// Manuscript status collapsed to three meaningful states.
const LEAF_STATUS = { idea: 'planned', drafting: 'drafting', edited: 'done', done: 'done' };
const LEAF_STATUS_LABEL = { planned: 'Planned', drafting: 'Drafting', done: 'Done' };

// Moon-phase status dot: empty ring → half → full.
function LeafStatusDot({ status, t }) {
  const s = 9;
  const base = { width: s, height: s, borderRadius: '50%', flexShrink: 0, display: 'inline-block', boxSizing: 'border-box' };
  let style;
  if (status === 'done') style = { ...base, background: t.done };
  else if (status === 'drafting') style = { ...base, border: `1.5px solid ${t.done}`, background: `linear-gradient(90deg, ${t.done} 0 50%, transparent 50% 100%)` };
  else style = { ...base, border: `1.5px solid ${t.dotEmpty}`, background: 'transparent' };
  return <span title={LEAF_STATUS_LABEL[status]} style={style} />;
}

// Drag handle — 6-dot grip, fades in on row hover. Lives in the left gutter
// so it never shifts layout. Shown for parts, chapters and sections alike.
function LeafGrip({ t, left = 3 }) {
  return (
    <span className="leaf-grip" aria-hidden="true" style={{
      position: 'absolute', left, top: '50%', transform: 'translateY(-50%)',
      display: 'grid', gridTemplateColumns: '2px 2px', gap: 2,
      opacity: 0, transition: 'opacity .12s', cursor: 'grab',
    }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <span key={i} style={{ width: 2, height: 2, borderRadius: '50%', background: t.faint }} />
      ))}
    </span>
  );
}

// Status control — the moon dot is a button; clicking it opens a labelled
// menu of the three phases. Closed, it shows only the icon.
function LeafStatusControl({ status, open, onToggle, onPick, t }) {
  const opts = ['planned', 'drafting', 'done'];
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
      <button
        className="leaf-statusbtn"
        title={LEAF_STATUS_LABEL[status]}
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        style={{ all: 'unset', cursor: 'pointer', width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 5 }}
      >
        <LeafStatusDot status={status} t={t} />
      </button>
      {open && (
        <div onClick={(e) => e.stopPropagation()} style={{
          position: 'absolute', top: 26, right: 0, width: 150, zIndex: 50,
          background: t.pill, border: `1px solid ${t.pillEdge}`, borderRadius: 10,
          boxShadow: t.barShadow, padding: 4, fontFamily: "'Hanken Grotesk', sans-serif",
        }}>
          {opts.map((o) => (
            <button key={o} className="leaf-statusopt" onClick={(e) => { e.stopPropagation(); onPick(o); }} style={{
              all: 'unset', boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 9, width: '100%',
              padding: '6px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 12.5,
              background: o === status ? t.accentSoft : 'transparent',
            }}>
              <LeafStatusDot status={o} t={t} />
              <span style={{ flex: 1, color: o === status ? t.ink : t.prose, fontWeight: o === status ? 600 : 450 }}>{LEAF_STATUS_LABEL[o]}</span>
              {o === status && <Icon name="check" size={13} style={{ color: t.accent }} />}
            </button>
          ))}
        </div>
      )}
    </span>
  );
}

function LeafChapterRow({ ch, t, status, menuOpen, onToggleMenu, onPickStatus }) {
  return (
    <div className="leaf-chrow" style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px 7px 16px',
      borderRadius: 7, cursor: 'pointer', position: 'relative',
      background: ch.active ? t.accentSoft : 'transparent',
    }}>
      {ch.active && <span style={{ position: 'absolute', left: 0, top: 8, bottom: 8, width: 2.5, borderRadius: 2, background: t.accent }} />}
      <LeafGrip t={t} left={3} />
      <span style={{ width: 16, fontSize: 11, fontVariantNumeric: 'tabular-nums', color: ch.active ? t.accent : t.faint, fontWeight: 600 }}>
        {String(ch.n).padStart(2, '0')}
      </span>
      <span style={{ flex: 1, fontSize: 13.5, color: ch.active ? t.ink : t.prose, fontWeight: ch.active ? 600 : 450, letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {ch.title}
      </span>
      {/* right zone: persistent add-section button, word count, status */}
      <span className="leaf-add" title="Add section" style={{ width: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 5, color: t.muted, opacity: 0.45, transition: 'opacity .12s, color .12s, background .12s', flexShrink: 0 }}>
        <Icon name="plus" size={12} />
      </span>
      <span style={{ fontSize: 10.5, color: t.faint, fontVariantNumeric: 'tabular-nums', minWidth: 32, textAlign: 'right', flexShrink: 0 }}>
        {ch.words.toLocaleString()}
      </span>
      <LeafStatusControl status={status} open={menuOpen} onToggle={onToggleMenu} onPick={onPickStatus} t={t} />
    </div>
  );
}

// Theme switch — sun · track · moon, matching the app's ThemeToggle.
function LeafThemeSwitch({ theme, onToggle, t }) {
  const isDark = theme === 'dark';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <Icon name="sun" size={14} style={{ color: isDark ? t.faint : t.muted }} />
      <button
        role="switch" aria-checked={isDark} aria-label="Toggle dark mode"
        onClick={onToggle}
        style={{
          all: 'unset', cursor: 'pointer', width: 30, height: 16, borderRadius: 999, boxSizing: 'border-box',
          background: isDark ? t.accent : t.track, border: `1px solid ${isDark ? t.accent : t.border}`,
          position: 'relative', transition: 'background .18s, border-color .18s', flexShrink: 0,
        }}
      >
        <span style={{ position: 'absolute', top: 1, left: isDark ? 15 : 1, width: 12, height: 12, borderRadius: '50%', background: isDark ? '#fff' : t.pill, boxShadow: '0 1px 2px rgba(0,0,0,0.25)', transition: 'left .18s' }} />
      </button>
      <Icon name="moon" size={14} style={{ color: isDark ? t.ink : t.faint }} />
    </span>
  );
}

function DirectionLeaf({ theme = 'light', onToggleTheme }) {
  const t = LEAF_THEMES[theme];
  const { useState } = React;
  const [statuses, setStatuses] = useState(() => {
    const m = {};
    NOVEL.parts.forEach((p) => p.chapters.forEach((ch) => { m[ch.n] = LEAF_STATUS[ch.status] || 'planned'; }));
    return m;
  });
  const [openMenu, setOpenMenu] = useState(null);
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', background: t.bg, fontFamily: "'Hanken Grotesk', system-ui, sans-serif", color: t.ink, overflow: 'hidden', position: 'relative' }}>
      <style>{`
        .leaf-chrow:hover { background: ${t.accentSoft} !important; }
        .leaf-chrow:hover .leaf-add { opacity: 1 !important; }
        .leaf-add:hover, .leaf-addch:hover { background: ${t.accentSoft}; color: ${t.accent} !important; opacity: 1 !important; }
        .leaf-part:hover .leaf-addch { opacity: 1; }
        .leaf-scene:hover { background: ${t.accentSoft} !important; }
        .leaf-newpart:hover { color: ${t.accent}; }
        .leaf-footbtn:hover { color: ${t.ink}; background: ${t.accentSoft}; }
        .leaf-chrow:hover .leaf-grip, .leaf-part:hover .leaf-grip, .leaf-scene:hover .leaf-grip { opacity: 1 !important; }
        .leaf-statusbtn:hover { background: ${t.accentSoft}; }
        .leaf-statusopt:hover { background: ${t.accentSoft} !important; }
      `}</style>
      {openMenu != null && <div onClick={() => setOpenMenu(null)} style={{ position: 'absolute', inset: 0, zIndex: 40 }} />}

      {/* ── Outline rail ── */}
      <aside style={{ width: 304, flexShrink: 0, background: t.side, borderRight: `1px solid ${t.sideEdge}`, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '26px 22px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Wordmark color={t.ink} dot={t.accent} size={21} />
            <Icon name="settings" size={16} style={{ color: t.faint }} />
          </div>
          <div style={{ marginTop: 22 }}>
            <div style={{ fontFamily: "'Newsreader', serif", fontSize: 23, fontWeight: 600, letterSpacing: '-0.02em', color: t.ink }}>{NOVEL.project}</div>
            <div style={{ fontSize: 12, color: t.muted, marginTop: 3, letterSpacing: '0.01em' }}>{NOVEL.kind} · {NOVEL.totalWords} words</div>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'visible', padding: '14px 12px 0' }}>
          {NOVEL.parts.map((part, pi) => (
            <div key={pi} style={{ marginBottom: 16 }}>
              <div className="leaf-part" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 10px 6px 16px', position: 'relative' }}>
                <LeafGrip t={t} left={3} />
                <span style={{ flex: 1, fontFamily: "'Newsreader', serif", fontStyle: 'italic', fontSize: 12.5, color: t.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{part.label}</span>
                <span className="leaf-addch" title="Add chapter" style={{ width: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 5, color: t.muted, opacity: 0.5, transition: 'opacity .12s, color .12s, background .12s', cursor: 'pointer', flexShrink: 0 }}>
                  <Icon name="plus" size={13} />
                </span>
              </div>
              {part.chapters.map((ch) => (
                <div key={ch.n}>
                  <LeafChapterRow
                    ch={ch} t={t}
                    status={statuses[ch.n]}
                    menuOpen={openMenu === ch.n}
                    onToggleMenu={() => setOpenMenu(openMenu === ch.n ? null : ch.n)}
                    onPickStatus={(o) => { setStatuses((m) => ({ ...m, [ch.n]: o })); setOpenMenu(null); }}
                  />
                  {ch.active && (
                    <div style={{ margin: '2px 0 6px 30px', paddingLeft: 12, borderLeft: `1px solid ${t.sideEdge}` }}>
                      {SCENES.map((s, si) => (
                        <div key={si} className="leaf-scene" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px 4px 16px', borderRadius: 6, fontSize: 12.5, color: s.active ? t.ink : t.muted, cursor: 'pointer', transition: 'background .12s', position: 'relative' }}>
                          <LeafGrip t={t} left={2} />
                          <span style={{ width: 4, height: 4, borderRadius: '50%', background: s.active ? t.accent : t.faint, flexShrink: 0 }} />
                          <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.title}</span>
                          <span style={{ fontSize: 10.5, color: t.faint, fontVariantNumeric: 'tabular-nums' }}>{s.words}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>

        <div style={{ borderTop: `1px solid ${t.sideEdge}` }}>
          <div className="leaf-newpart" style={{ padding: '12px 22px 8px', display: 'flex', alignItems: 'center', gap: 8, color: t.muted, fontSize: 13, cursor: 'pointer', transition: 'color .15s' }}>
            <Icon name="plus" size={15} /> <span>New part</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 16px 14px' }}>
            {[['logOut', 'Log out'], ['trash', 'Trash'], ['help', 'Help']].map(([ic, label]) => (
              <span key={label} className="leaf-footbtn" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 8px', borderRadius: 6, fontSize: 11.5, color: t.faint, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'color .12s, background .12s' }}>
                <Icon name={ic} size={13} /> {label}
              </span>
            ))}
          </div>
        </div>
      </aside>

      {/* ── Editor ── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header style={{ height: 52, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 30px', color: t.muted }}>
          <div style={{ fontSize: 12.5, letterSpacing: '0.01em' }}>
            {NOVEL.project} <span style={{ color: t.faint, margin: '0 7px' }}>/</span> Part I <span style={{ color: t.faint, margin: '0 7px' }}>/</span> <span style={{ color: t.ink, fontWeight: 500 }}>The Tidewatch</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, fontSize: 12 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#7DA98C' }} /> Saved</span>
            <span style={{ color: t.accent, fontWeight: 600 }}>+612 today</span>
            <Icon name="focus" size={16} style={{ color: t.faint }} />
            <span style={{ width: 1, height: 16, background: t.sideEdge }} />
            <LeafThemeSwitch theme={theme} onToggle={onToggleTheme} t={t} />
          </div>
        </header>

        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', justifyContent: 'center', padding: '34px 30px 0' }}>
          <article style={{ width: '100%', maxWidth: 660, position: 'relative' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.22em', color: t.accent, textTransform: 'uppercase' }}>Chapter Three</div>
            <h1 style={{ fontFamily: "'Newsreader', serif", fontWeight: 500, fontSize: 44, lineHeight: 1.08, letterSpacing: '-0.02em', color: t.ink, margin: '12px 0 8px' }}>The Tidewatch</h1>
            <div style={{ width: 38, height: 2, background: t.accent, opacity: 0.6, marginBottom: 26 }} />

            <div style={{ fontFamily: "'Newsreader', serif", fontSize: 20, lineHeight: 1.72, color: t.prose }}>
              {/* Para 1 with drop cap + selection + floating toolbar */}
              <p style={{ margin: '0 0 18px', position: 'relative' }}>
                <span style={{ float: 'left', fontSize: 62, lineHeight: 0.84, fontWeight: 500, paddingRight: 10, marginTop: 6, color: t.ink, fontFamily: "'Newsreader', serif" }}>T</span>
                he lighthouse had been dark for three winters before{' '}
                <span style={{ position: 'relative', background: t.sel, borderRadius: 2, boxShadow: `0 0 0 1px ${t.accent}33` }}>
                  Maren agreed to climb it again
                  {/* contextual floating toolbar */}
                  <span style={{
                    position: 'absolute', left: '50%', top: -46, transform: 'translateX(-50%)',
                    display: 'flex', alignItems: 'center', gap: 2, padding: '5px 6px',
                    background: t.pill, border: `1px solid ${t.pillEdge}`, borderRadius: 10,
                    boxShadow: t.barShadow, whiteSpace: 'nowrap', fontFamily: "'Hanken Grotesk', sans-serif",
                  }}>
                    {['bold', 'italic', 'underline'].map((ic) => (
                      <span key={ic} style={{ width: 26, height: 26, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, color: t.ink }}><Icon name={ic} size={14} /></span>
                    ))}
                    <span style={{ width: 1, height: 16, background: t.pillEdge, margin: '0 3px' }} />
                    <span style={{ width: 26, height: 26, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, color: t.ink }}><Icon name="type" size={14} /></span>
                    <span style={{ width: 26, height: 26, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, color: t.accent, background: t.accentSoft }}><Icon name="highlighter" size={14} /></span>
                    <span style={{ width: 1, height: 16, background: t.pillEdge, margin: '0 3px' }} />
                    <span style={{ width: 26, height: 26, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, color: t.ink }}><Icon name="message" size={14} /></span>
                    <span style={{ position: 'absolute', left: '50%', bottom: -5, transform: 'translateX(-50%) rotate(45deg)', width: 9, height: 9, background: t.pill, borderRight: `1px solid ${t.pillEdge}`, borderBottom: `1px solid ${t.pillEdge}` }} />
                  </span>
                </span>. The town had stopped expecting the light by then — the fishermen learned the rocks the way they learned their own hands.
              </p>
              <p style={{ margin: '0 0 18px' }}>{PROSE[1]}</p>
              <p style={{ margin: '0 0 18px' }}>
                At the top, the lamp room held its breath. The great lens sat beneath its canvas like something sleeping, and beyond the glass the sea went on rehearsing{' '}
                <span style={{ background: t.comment, borderRadius: 2, paddingBottom: 1, boxShadow: `inset 0 -1px 0 ${t.commentEdge}` }}>the only sentence it knew</span>.
              </p>
            </div>

            {/* margin comment marker */}
            <div style={{ position: 'absolute', right: -34, top: 232, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 26, height: 26, borderRadius: '50% 50% 50% 4px', background: t.comment, border: `1px solid ${t.commentEdge}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: t.barShadow }}>
                <Avatar initials="J" bg={theme === 'dark' ? '#7C5C3C' : '#9B6B3E'} size={18} />
              </span>
            </div>
          </article>
        </div>
      </main>
    </div>
  );
}

window.DirectionLeaf = DirectionLeaf;
