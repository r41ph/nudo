import { useEffect } from 'react';
import { useAtom } from 'jotai';
import { Switch } from '@ui/components/ui/switch';
import { Icon } from '@ui/components/icon/icon';
import { themeAtom } from '@web/shared/state/theme.atom';

function resolveIsDark(theme: string): boolean {
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function ThemeToggle() {
  const [theme, setTheme] = useAtom(themeAtom);

  useEffect(() => {
    const root = document.documentElement;

    function applyTheme() {
      if (resolveIsDark(theme)) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }

    applyTheme();

    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', applyTheme);
      return () => mq.removeEventListener('change', applyTheme);
    }
  }, [theme]);

  const isDark = resolveIsDark(theme);

  function handleToggle(checked: boolean) {
    setTheme(checked ? 'dark' : 'light');
  }

  return (
    <div className="flex items-center gap-1.5">
      <span aria-hidden="true" className="flex items-center text-muted-foreground">
        <Icon name="sun" className="size-3.5" />
      </span>
      <Switch
        checked={isDark}
        onCheckedChange={handleToggle}
        aria-label="Toggle dark mode"
      />
      <span aria-hidden="true" className="flex items-center text-muted-foreground">
        <Icon name="moon" className="size-3.5" />
      </span>
    </div>
  );
}
