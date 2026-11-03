import { t as translate } from '../../app/i18n/language';
import { useId, useState, type ReactNode } from 'react';
import { Button, DateInput, Field, Input, Modal, MoneyInput } from '@tingting/design-system';
import { money, today } from '../../domain.mjs';
import type { Debt, Group, Settlement } from '../../types';
import { Form, MemberSelect } from '../../shared/forms';
import { useSettlementParticipants } from './hooks/useSettlementParticipants';
import { debtBetween } from './utils/participants.mjs';
import s from './SettlementForm.module.css';
export default function SettlementForm({
  g,
  value,
  debts,
  identity,
  busy,
  onSave,
  onClose,
  alert,
}: {
  g: Group;
  value?: Partial<Settlement>;
  debts: Debt[];
  identity: string;
  busy: boolean;
  onSave: (x: unknown) => void;
  onClose: () => void;
  alert?: ReactNode;
}) {
  const formId = useId();
  const [amount, setAmount] = useState(value?.amount || 0);
  const [draftId] = useState(() => value?.id || crypto.randomUUID());
  const initialFrom = value?.fromId || identity || g.members[0]?.id || '';
  const { from, to, selectFrom, selectTo } = useSettlementParticipants(
    initialFrom,
    value?.toId || g.members.find((m) => m.id !== initialFrom)?.id || '',
  );
  const debt = debtBetween(debts, from, to);
  return (
    <Modal
      title={value?.id ? translate("Chỉnh sửa thanh toán") : translate("Thanh toán")}
      onClose={onClose}
      footer={<Button loading={busy} className={s.submit} type="submit" form={formId} disabled={busy || !amount || !from || !to || from === to}>
        {busy ? translate("Đang lưu…") : translate("Thanh toán")}
      </Button>}
    >
      {alert}
      <Form
      id={formId}
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
      <Field label={translate("Người trả")}>
        <MemberSelect g={g} value={from} onChange={selectFrom} label={translate("Người trả")} />
      </Field>
      <Field label={translate("Người nhận")}>
        <MemberSelect g={g} value={to} onChange={selectTo} label={translate("Người nhận")} />
      </Field>
      <div className={s.amountSection}>
        <div className={s.amountRow}>
          <Field label={translate("Số tiền (₫)")}>
            <MoneyInput
              className={s.amountInput}
              value={amount}
              onValueChange={setAmount}
              name="amount"
              required
              aria-label={translate("Số tiền")}
            />
          </Field>
          {debt > 0 && !value?.id && (
            <Button className={s.fullDebt} type="button" variant="secondary" small onClick={() => setAmount(debt)}>
              {translate("Toàn bộ nợ")} ({money(debt)})
            </Button>
          )}
        </div>
        <span className={s.amountHelp}>{translate("Có thể nhập số tiền trả một phần.")}</span>
      </div>
      <DateInput label={translate("Ngày thanh toán")} name="date" defaultValue={value?.date || today()} required />
      <Field label={translate("Ghi chú (không bắt buộc)")}>
        <Input
          name="note"
          defaultValue={value?.note}
          placeholder={translate("Ví dụ: Đã chuyển khoản")}
          maxLength={1000}
        />
      </Field>
      <p className={s.notice}>{translate("Chỉ ghi nhận khoản trả, không chuyển tiền.")}</p>
      </Form>
    </Modal>
  );
}
