import { ChevronDownIcon } from '@tingting/design-system';
import EmptyState from '../../shared/empty-state/EmptyState';
import type { AccountDebt } from '../../api';
import { money } from '../../domain.mjs';
import s from './AccountSummary.module.css';
export default function AccountSummary({
  label,
  total,
  items,
  receive = false,
}: {
  label: string;
  total: number;
  items: AccountDebt[];
  receive?: boolean;
}) {
  return (
    <details className={`${s.summary} ${receive ? s.receive : ''}`}>
      <summary>
        <span>{label}</span>
        <strong>{money(total)}</strong>
        <ChevronDownIcon />
      </summary>
      <div className={s.list}>
        {items.map((item) => (
          <a key={item.groupId + item.personId} href={'/g/' + item.token} className={s.row}>
            <span>
              <b>{item.personName}</b>
              <small>{item.groupName}</small>
            </span>
            <strong>{money(item.amount)}</strong>
          </a>
        ))}
        {!items.length && <EmptyState compact><p>Không có khoản nào.</p></EmptyState>}
      </div>
    </details>
  );
}
