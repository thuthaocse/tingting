import { Button, MoonIcon, SunIcon } from '@tingting/design-system';
import { t } from '../i18n/language';
import s from './ThemeButton.module.css';

export default function ThemeButton({ theme, onToggle, showLabel = false, className = '' }: {
  theme: 'light' | 'dark';
  onToggle: () => void;
  showLabel?: boolean;
  className?: string;
}) {
  const label = theme === 'dark' ? t('Chuyển sang giao diện sáng') : t('Chuyển sang giao diện tối');
  return (
    <Button type="button" variant="quiet" className={`${s.button} ${className}`} aria-label={label} title={label} onClick={onToggle}>
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
      {showLabel && <span>{theme === 'dark' ? t('Giao diện sáng') : t('Giao diện tối')}</span>}
    </Button>
  );
}
