import { t as translate } from '../../app/i18n/language';
import { Button, ChevronDownIcon } from '@tingting/design-system';
import type { Debt, Group } from '../../types';
import { money } from '../../domain.mjs';
import { name } from '../../shared/forms';
import s from './PersonalBalances.module.css';
export default function PersonalBalances({
  group,
  outgoing,
  incoming,
  onRecord,
  readOnly = false,
}: {
  group: Group;
  outgoing: Debt[];
  incoming: Debt[];
  onRecord: (d: Debt) => void;
  readOnly?: boolean;
}) {
  return (
    <div className={s.balances}>
      {outgoing.length > 0 && (
        <BalanceSection group={group} items={outgoing} onRecord={onRecord} readOnly={readOnly} />
      )}
      {incoming.length > 0 && (
        <BalanceSection
          group={group}
          items={incoming}
          receive
          onRecord={onRecord}
          readOnly={readOnly}
        />
      )}
      {!outgoing.length && !incoming.length && (
        <p className={s.settled}>{group.expenses.length ? translate("✓ Bạn đã thanh toán hết. Nhẹ lòng rồi!") : translate("✓ Không có khoản nợ.")}</p>
      )}
    </div>
  );
}
function BalanceSection({
  group,
  items,
  receive = false,
  onRecord,
  readOnly = false,
}: {
  group: Group;
  items: Debt[];
  receive?: boolean;
  onRecord: (d: Debt) => void;
  readOnly?: boolean;
}) {
  return (
    <details className={s.balanceSection}>
      <summary className={receive ? s.receive : s.pay}>
        <span className={s.summaryLabel}>{receive ? translate("Bạn được nhận") : translate("Bạn cần trả")}</span>
        <span className={s.summaryMeta}>
          <strong>{money(items.reduce((total, debt) => total + debt.amount, 0))}</strong>
          <span className={s.count}>{items.length} {translate("người")}</span>
          <span className={s.chevron}>
            <ChevronDownIcon />
          </span>
        </span>
      </summary>
      {items.map((d) => (
        <div key={d.fromId + d.toId} className={s.miniDebt}>
          <span>{name(group, receive ? d.fromId : d.toId)}</span>
          <strong>{money(d.amount)}</strong>
          {!readOnly && (
            <Button variant="quiet" small onClick={() => onRecord(d)}>
              {translate("Thanh toán")}
            </Button>
          )}
        </div>
      ))}
    </details>
  );
}
