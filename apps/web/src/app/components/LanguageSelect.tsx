import { languages, setLanguage, t, useLanguage, type Language } from '../i18n/language';
import { useHeaderMenu } from '../hooks/useHeaderMenu';
import s from './LanguageSelect.module.css';

export default function LanguageSelect({ align = 'end', showLabel = false }: { align?: 'start' | 'end'; showLabel?: boolean }) {
  const language = useLanguage();
  const { menuRef, close } = useHeaderMenu();
  return (
    <details
      ref={menuRef}
      className={`${s.root} ${showLabel ? s.menuLanguage : ''}`}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && menuRef.current?.open) {
          event.stopPropagation();
          close();
          menuRef.current.querySelector('summary')?.focus();
        }
      }}
    >
      <summary className={s.trigger} aria-label={`${t('Chọn ngôn ngữ')}: ${languages[language].label}`} title={t('Chọn ngôn ngữ')}>
        <span aria-hidden="true">{languages[language].flag}</span>
        <span className={s.code}>{showLabel ? languages[language].label : language.toUpperCase()}</span>
      </summary>
      <div className={`${s.options} ${align === 'start' ? s.alignStart : ''}`} aria-label={t('Ngôn ngữ')}>
        {(Object.keys(languages) as Language[]).map((code) => (
          <button
            key={code}
            type="button"
            className={s.option}
            aria-pressed={language === code}
            onClick={() => { setLanguage(code); close(); menuRef.current?.querySelector('summary')?.focus(); }}
          >
            <span aria-hidden="true">{languages[code].flag}</span>
            <span>{languages[code].label}</span>
            {language === code && <span className={s.check} aria-hidden="true">✓</span>}
          </button>
        ))}
      </div>
    </details>
  );
}
