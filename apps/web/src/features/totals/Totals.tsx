import { useState } from 'react';
import { Avatar, SearchSelect } from '@tingting/design-system';
import { money } from '../../domain.mjs';
import type { Group } from '../../types';
import s from './Totals.module.css';
export default function Totals({ g }: { g: Group }) {
  const [month, setMonth] = useState('');
  const expenses = g.expenses.filter((e) => !month || e.date.startsWith(month));
  return (
    <>
      <div className={s.contentHeader}>
        <h2>Tổng chi</h2>
        <div className={s.monthFilter}>
          <SearchSelect
            label="Lọc theo tháng"
            value={month || 'all'}
            onChange={(value) => setMonth(value === 'all' ? '' : value)}
            placeholder="Tất cả thời gian"
            searchPlaceholder="Tìm tháng…"
            options={[
              { id: 'all', label: 'Tất cả thời gian' },
              ...Array.from(new Set(g.expenses.map((expense) => expense.date.slice(0, 7))))
                .sort()
                .reverse()
                .map((value) => ({
                  id: value,
                  label: `Tháng ${Number(value.slice(5))}/${value.slice(0, 4)}`,
                })),
            ]}
          />
        </div>
      </div>
      <div className={s.stat}>
        <span className={s.muted}>Tổng chi của nhóm</span>
        <strong>{money(expenses.reduce((v, e) => v + e.amount, 0))}</strong>
        <span className={s.muted}>
          {expenses.length} khoản chi · {g.members.length} thành viên
        </span>
      </div>
      <h3>Theo thành viên</h3>
      <div className={s.tableWrap}>
        <table className={s.table}>
          <thead>
            <tr>
              <th>Thành viên</th>
              <th>Đã trả</th>
              <th>Phần chia</th>
            </tr>
          </thead>
          <tbody>
            {g.members.map((m) => (
              <tr key={m.id}>
                <td>
                  <div className={s.memberLabel}>
                    <Avatar name={m.name} />
                    <span>{m.name}</span>
                  </div>
                </td>
                <td>
                  {money(
                    expenses.filter((e) => e.payerId === m.id).reduce((v, e) => v + e.amount, 0),
                  )}
                </td>
                <td>
                  {money(
                    expenses
                      .flatMap((e) => e.shares)
                      .filter((x) => x.memberId === m.id)
                      .reduce((v, x) => v + x.amount, 0),
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={s.footer}>Tổng chi không bao gồm các khoản thanh toán nợ.</p>
    </>
  );
}
