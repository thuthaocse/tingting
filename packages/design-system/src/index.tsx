import {
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import s from './ui.module.css';
import wordmark from './assets/tingting-wordmark.png';
export function Button({
  variant = 'primary',
  small = false,
  className = '',
  loading = false,
  children,
  ...p
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger';
  small?: boolean;
  loading?: boolean;
}) {
  return (
    <button
      {...p}
      className={`${s.button} ${s[variant] || ''} ${small ? s.small : ''} ${className}`}
      aria-busy={loading || undefined}
    >
      {loading && <span className={s.spinner} aria-hidden="true" />}
      {children}
    </button>
  );
}
export function LoadingIndicator({ label = 'Đang tải…' }: { label?: string }) {
  return (
    <div className={s.loading} role="status">
      <span className={s.spinner} aria-hidden="true" />
      <span>{label}</span>
    </div>
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
    <a href="/" className={s.logo} aria-label="TingTing — Trang chủ">
      <img src={wordmark} alt="" />
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
    <nav aria-label="Nội dung sổ chi tiêu" className={s.tabs}>
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
let modalCount = 0;
let pageOverflow = '';

export function Modal({
  title,
  onClose,
  children,
  footer,
  style,
  className = '',
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  style?: CSSProperties;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    const unlockPage = lockPageScroll();
    dialog?.showModal();
    titleRef.current?.focus({ preventScroll: true });
    return () => {
      dialog?.close();
      unlockPage();
    };
  }, []);
  return (
    <div className={s.overlay}>
      <dialog
        ref={ref}
        aria-labelledby={titleId}
        className={`${s.dialog} ${className}`}
        style={style}
        onCancel={(e) => {
          e.preventDefault();
          onClose();
        }}
      >
        <div className={s.dialogHeader}>
          <h2 id={titleId} ref={titleRef} tabIndex={-1}>
            {title}
          </h2>
          <Button type="button" variant="quiet" className={s.closeButton} aria-label="Đóng" onClick={onClose}>
            ✕
          </Button>
        </div>
        <div className={s.dialogBody}>{children}</div>
        {footer && <div className={s.dialogFooter}>{footer}</div>}
      </dialog>
    </div>
  );
}
function lockPageScroll() {
  if (modalCount === 0) {
    pageOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  modalCount += 1;
  return () => {
    modalCount -= 1;
    if (modalCount === 0) document.body.style.overflow = pageOverflow;
  };
}

export { s as uiStyles };

export { DateInput } from './components/DateInput';
export { searchKey } from './utils/inputs.mjs';
export { MoneyInput } from './components/MoneyInput';
export { SearchSelect } from './components/SearchSelect';
export {
  PlusIcon,
  CopyIcon,
  ChevronDownIcon,
  ShareIcon,
  SettingsIcon,
  MenuIcon,
  LogoutIcon,
  GroupIcon,
} from './components/Icons';
