// jsdom has no matchMedia. This stand-in evaluates width queries against a
// test-controlled viewport so layout code sees a real desktop by default and a
// test can cross a breakpoint with setViewportWidth(). Every other query
// (colour scheme, reduced motion) reports false: light theme, motion allowed.

type Listener = (event: MediaQueryListEvent) => void;

interface Entry {
  query: string;
  listeners: Set<Listener>;
  lastMatches: boolean;
}

export const DEFAULT_VIEWPORT_WIDTH = 1440;

let viewportWidth = DEFAULT_VIEWPORT_WIDTH;
let entries: Entry[] = [];

function evaluate(query: string, width: number): boolean {
  const min = /min-width:\s*(\d+(?:\.\d+)?)px/.exec(query);
  const max = /max-width:\s*(\d+(?:\.\d+)?)px/.exec(query);
  if (!min && !max) return false;
  return (!min || width >= Number(min[1])) && (!max || width <= Number(max[1]));
}

function setInnerWidth(width: number): void {
  // useIsMobile reads innerWidth alongside its media query; keep them agreeing.
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width,
  });
}

function matchMedia(query: string): MediaQueryList {
  const entry: Entry = {
    query,
    listeners: new Set(),
    lastMatches: evaluate(query, viewportWidth),
  };
  entries.push(entry);

  const add = (listener: Listener) => entry.listeners.add(listener);
  const remove = (listener: Listener) => entry.listeners.delete(listener);

  return {
    media: query,
    onchange: null,
    get matches() {
      return evaluate(query, viewportWidth);
    },
    addEventListener: (_type: string, listener: Listener) => add(listener),
    removeEventListener: (_type: string, listener: Listener) =>
      remove(listener),
    addListener: add,
    removeListener: remove,
    dispatchEvent: () => false,
  } as unknown as MediaQueryList;
}

export function installMatchMedia(): void {
  viewportWidth = DEFAULT_VIEWPORT_WIDTH;
  entries = [];
  setInnerWidth(DEFAULT_VIEWPORT_WIDTH);
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: matchMedia,
  });
}

// Wrap in act() when components are mounted: listeners set React state.
export function setViewportWidth(width: number): void {
  viewportWidth = width;
  setInnerWidth(width);
  for (const entry of entries) {
    const matches = evaluate(entry.query, width);
    if (matches === entry.lastMatches) continue;
    entry.lastMatches = matches;
    const event = { matches, media: entry.query } as MediaQueryListEvent;
    for (const listener of entry.listeners) listener(event);
  }
}
