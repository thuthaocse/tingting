import { activityEntries } from './utils/activity.mjs';
import type { Group, Expense, Settlement } from '../../types';
import { money } from '../../domain.mjs';
import { name } from '../../shared/forms';
import s from './Activity.module.css';
export default function Activity({
  g,
  identity,
  openExpense,
  openSettlement,
}: {
  g: Group;
  identity: string;
  openExpense: (e: Expense) => void;
  openSettlement: (s: Settlement) => void;
}) {
  const entries = activityEntries(g) as Array<{
    id: string;
    date: string;
    createdAt?: string;
    expense?: Expense;
    settlement?: Settlement;
  }>;
  return (
    <>
      {entries.map((row, i) => {
        const { expense, settlement } = row;
        const share = expense?.shares.find((x) => x.memberId === identity)?.amount || 0;
        const receivable = expense?.payerId === identity ? expense.amount - share : 0;
        return (
          <div
            key={row.id}
            className={`${s.entry} ${!entries[i + 1] || entries[i + 1].date !== row.date ? s.lastOfDay : ''}`}
          >
            {(i === 0 || entries[i - 1].date !== row.date) && (
              <p className={s.date}>
                {new Date(row.date + 'T12:00:00').toLocaleDateString('vi-VN', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            )}
              <button
                className={s.activityRow}
                onClick={() =>
                  expense ? openExpense(expense) : settlement && openSettlement(settlement)
                }
              >
                <span className={`${s.activityIcon} ${settlement ? s.paymentIcon : ''}`}>
                  {expense ? '▤' : '↗'}
                </span>
                <div className={s.activityInfo}>
                  <strong>
                    {expense
                      ? expense.title
                      : `${name(g, settlement!.fromId)} đã trả ${name(g, settlement!.toId)}`}
                  </strong>
                  <p>
                    {expense
                      ? `${name(g, expense.payerId)} đã trả ${money(expense.amount)}`
                      : settlement?.note || 'Thanh toán nợ'}
                  </p>
                </div>
                <div className={`${s.activityAmount} ${receivable ? s.receive : share ? s.pay : ''}`}>
                  {expense ? (
                    <>
                      {!identity ? (
                        <>
                          <span>Tổng khoản chi</span>
                          <strong>{money(expense.amount)}</strong>
                        </>
                      ) : receivable ? (
                        <>
                          <span>Bạn được nhận</span>
                          <strong>{money(receivable)}</strong>
                        </>
                      ) : share ? (
                        <>
                          <span>Phần của bạn</span>
                          <strong>{money(share)}</strong>
                        </>
                      ) : (
                        <span>Không tham gia</span>
                      )}
                    </>
                  ) : (
                    <strong>{money(settlement!.amount)}</strong>
                  )}
                </div>
              </button>
          </div>
        );
      })}
      {!entries.length && (
        <p className={s.empty}>Chưa có hoạt động. Thêm khoản chi đầu tiên nhé!</p>
      )}
    </>
  );
}
