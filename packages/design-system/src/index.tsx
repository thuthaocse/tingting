import {
  useEffect,
  useRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import s from './ui.module.css';
export function Button({
  variant = 'primary',
  small = false,
  className = '',
  ...p
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger';
  small?: boolean;
}) {
  return (
    <button
      {...p}
      className={`${s.button} ${s[variant] || ''} ${small ? s.small : ''} ${className}`}
    />
  );
}
export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${s.input} ${className}`} />;
}
export function Field({
  label,
  children,
  help,
}: {
  label: string;
  children: ReactNode;
  help?: string;
}) {
  return (
    <label className={s.field}>
      <span>{label}</span>
      {children}
      {help && <span className={s.help}>{help}</span>}
    </label>
  );
}
export function Avatar({ name }: { name: string }) {
  return (
    <span aria-hidden="true" className={s.avatar}>
      {name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((n) => n[0])
        .join('')}
    </span>
  );
}
export function Logo() {
  return (
    <a href="/" className={s.logo} aria-label="Tingting — Trang chủ">
      <svg viewBox="0 0 64 48" aria-hidden="true">
        <g fill="none" stroke="currentColor" strokeWidth="7">
          <rect x="7" y="6" width="29" height="34" rx="14" transform="rotate(30 21 23)" />
          <rect x="28" y="8" width="29" height="34" rx="14" transform="rotate(30 42 25)" />
        </g>
      </svg>
      tingting<span aria-hidden="true">.</span>
    </a>
  );
}
export function Tabs({
  value,
  onChange,
  items,
}: {
  value: string;
  onChange: (v: string) => void;
  items: { id: string; label: string }[];
}) {
  return (
    <nav aria-label="Nội dung nhóm" className={s.tabs}>
      {items.map((t) => (
        <button
          key={t.id}
          aria-current={t.id === value ? 'page' : undefined}
          className={`${s.tab} ${value === t.id ? s.active : ''}`}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </nav>
  );
}
export function Badge({ children, positive = false }: { children: ReactNode; positive?: boolean }) {
  return <span className={`${s.badge} ${positive ? s.positive : ''}`}>{children}</span>;
}
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog?.showModal();
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);
  return (
    <div className={s.overlay}>
      <dialog
        ref={ref}
        aria-labelledby="dialog-title"
        className={s.dialog}
        onCancel={(e) => {
          e.preventDefault();
          onClose();
        }}
      >
        <div className={s.dialogHeader}>
          <h2 id="dialog-title">{title}</h2>
          <Button variant="quiet" aria-label="Đóng" onClick={onClose}>
            ✕
          </Button>
        </div>
        <div className={s.dialogBody}>{children}</div>
      </dialog>
    </div>
  );
}
export { s as uiStyles };

export { MoneyInput } from './components/MoneyInput';
export { SearchSelect } from './components/SearchSelect';
export {
  ChevronDownIcon,
  ShareIcon,
  SettingsIcon,
  MenuIcon,
  LogoutIcon,
  GroupIcon,
} from './components/Icons';
