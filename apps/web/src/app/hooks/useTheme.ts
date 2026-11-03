import { useState } from 'react';
import { applyTheme, readTheme } from '../utils/theme.mjs';

export function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    typeof document === 'undefined' ? 'light' : readTheme(window),
  );
  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    applyTheme(next, document.documentElement, window);
    setTheme(next);
  };
  return { theme, toggleTheme };
}
