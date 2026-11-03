import type { ReactNode } from 'react';
import illustration from './empty-piggy.png';
import s from './EmptyState.module.css';

export default function EmptyState({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  return (
    <div className={`${s.empty} ${compact ? s.compact : ''}`}>
      <img src={illustration} alt="" aria-hidden="true" />
      {children}
    </div>
  );
}
