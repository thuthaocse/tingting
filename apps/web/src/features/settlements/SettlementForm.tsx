import { useState } from 'react';
import { Button, DateInput, Field, Input, MoneyInput } from '@tingting/design-system';
import { today } from '../../domain.mjs';
import type { Group, Settlement } from '../../types';
import { Form, MemberSelect } from '../../shared/forms';
import s from './SettlementForm.module.css';
export default function SettlementForm({
  g,
  value,
  identity,
  busy,
  onSave,
}: {
  g: Group;
  value?: Partial<Settlement>;
  identity: string;
  busy: boolean;
  onSave: (x: unknown) => void;
}) {
  const [amount, setAmount] = useState(value?.amount || 0);
  const [draftId] = useState(() => value?.id || crypto.randomUUID());
  const [from, setFrom] = useState(value?.fromId || identity),
    [to, setTo] = useState(value?.toId || g.members.find((m) => m.id !== identity)?.id || '');
  return (
    <Form
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        onSave({
          id: draftId,
          fromId: from,
          toId: to,
          amount,
          date: f.get('date'),
          note: f.get('note'),
        });
      }}
    >
      <Field label="Người trả">
        <MemberSelect g={g} value={from} exclude={to} onChange={setFrom} label="Người trả" />
      </Field>
      <Field label="Người nhận">
        <MemberSelect g={g} value={to} exclude={from} onChange={setTo} label="Người nhận" />
      </Field>
      <Field label="Số tiền (₫)" help="Có thể nhập số tiền trả một phần.">
        <MoneyInput
          value={amount}
          onValueChange={setAmount}
          name="amount"
          required
          aria-label="Số tiền"
        />
      </Field>
      <DateInput label="Ngày thanh toán" name="date" defaultValue={value?.date || today()} required />
      <Field label="Ghi chú (không bắt buộc)">
        <Input
          name="note"
          defaultValue={value?.note}
          placeholder="Ví dụ: Đã chuyển khoản"
          maxLength={1000}
        />
      </Field>
      <p className={s.notice}>Chỉ ghi nhận khoản trả, không chuyển tiền.</p>
      <Button disabled={busy || !amount || !from || !to || from === to}>
        {busy ? 'Đang lưu…' : 'Thanh toán'}
      </Button>
    </Form>
  );
}
