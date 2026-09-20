import { useEffect } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { themeAtom, type Theme } from '@web/shared/state/theme.atom';

function resolveIsDark(theme: Theme): boolean {
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

// Mounted once at the app root so the class is applied on every route (login
// included), not only while the control that toggles it is on screen.
export function useApplyTheme(): void {
  const theme = useAtomValue(themeAtom);

  useEffect(() => {
    const root = document.documentElement;

    function applyTheme() {
      root.classList.toggle('dark', resolveIsDark(theme));
    }

    applyTheme();

    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', applyTheme);
      return () => mq.removeEventListener('change', applyTheme);
    }
  }, [theme]);
}

export function useDarkMode(): {
  isDark: boolean;
  setDark: (dark: boolean) => void;
} {
  const [theme, setTheme] = useAtom(themeAtom);
  return {
    isDark: resolveIsDark(theme),
    setDark: (dark) => setTheme(dark ? 'dark' : 'light'),
  };
}
