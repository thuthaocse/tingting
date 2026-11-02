import { useState } from 'react';
import { Avatar, Button, Field, Input, MoneyInput } from '@tingting/design-system';
import { money, splitEvenly, today } from '../../domain.mjs';
import type { Group, Expense } from '../../types';
import { Form, MemberSelect } from '../../shared/forms';
import s from './ExpenseForm.module.css';
export default function ExpenseForm({
  g,
  value,
  identity,
  busy,
  onSave,
}: {
  g: Group;
  value?: Expense;
  identity: string;
  busy: boolean;
  onSave: (x: unknown) => void;
}) {
  const [draftId] = useState(() => value?.id || crypto.randomUUID());
  const [amount, setAmount] = useState(value?.amount || 0),
    [payer, setPayer] = useState(value?.payerId || identity),
    [ids, setIds] = useState(value?.shares.map((x) => x.memberId) || g.members.map((m) => m.id));
  const validAmount = Number.isSafeInteger(amount) && amount > 0 && amount <= 1_000_000_000_000;
  const shares = validAmount && ids.length ? splitEvenly(amount, ids) : [];
  return (
    <Form
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        onSave({
          id: draftId,
          title: f.get('title'),
          amount,
          payerId: payer,
          date: f.get('date'),
          note: f.get('note'),
          participantIds: ids,
        });
      }}
    >
      <Field label="Tên khoản chi">
        <Input
          name="title"
          defaultValue={value?.title}
          placeholder="Ví dụ: Ăn tối"
          required
          maxLength={200}
        />
      </Field>
      <Field label="Số tiền (₫)">
        <MoneyInput value={amount} onValueChange={setAmount} required aria-label="Số tiền" />
      </Field>
      <div className={s.grid2}>
        <Field label="Ngày">
          <Input type="date" name="date" defaultValue={value?.date || today()} required />
        </Field>
        <Field label="Người trả tiền">
          <MemberSelect g={g} value={payer} onChange={setPayer} label="Người trả tiền" />
        </Field>
      </div>
      <div className={s.formTitle}>
        <h3>Chia cho</h3>
        <span className={s.muted}>{ids.length} người đã chọn</span>
      </div>
      <div className={s.splitList}>
        <label className={s.splitRow}>
          <input
            type="checkbox"
            checked={ids.length === g.members.length}
            onChange={(e) => setIds(e.target.checked ? g.members.map((m) => m.id) : [])}
          />
          Tất cả thành viên
        </label>
        {g.members.map((m) => (
          <label className={s.splitRow} key={m.id}>
            <input
              type="checkbox"
              checked={ids.includes(m.id)}
              onChange={(e) =>
                setIds(e.target.checked ? [...ids, m.id] : ids.filter((id) => id !== m.id))
              }
            />
            <Avatar name={m.name} />
            <span>{m.name}</span>
            <strong>{money(shares.find((x) => x.memberId === m.id)?.amount || 0)}</strong>
          </label>
        ))}
      </div>
      <p className={s.notice}>
        {ids.length
          ? `Chia đều · khoảng ${money(Math.floor(amount / ids.length))} / người`
          : 'Chọn ít nhất một người cùng chia.'}
      </p>
      <Field label="Ghi chú (không bắt buộc)">
        <Input name="note" defaultValue={value?.note} maxLength={1000} />
      </Field>
      <Button disabled={busy || !ids.length || !validAmount}>
        {busy ? 'Đang lưu…' : 'Lưu khoản chi'}
      </Button>
    </Form>
  );
}
