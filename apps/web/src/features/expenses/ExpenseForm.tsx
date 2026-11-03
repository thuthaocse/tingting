import { t as translate } from '../../app/i18n/language';
import { useId, useState, type ReactNode } from 'react';
import {
  Avatar,
  Button,
  ChevronDownIcon,
  DateInput,
  Field,
  Input,
  Modal,
  MoneyInput,
} from '@tingting/design-system';
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
  onClose,
  alert,
}: {
  g: Group;
  value?: Expense;
  identity: string;
  busy: boolean;
  onSave: (x: unknown) => void;
  onClose: () => void;
  alert?: ReactNode;
}) {
  const formId = useId();
  const [draftId] = useState(() => value?.id || crypto.randomUUID());
  const [amount, setAmount] = useState(value?.amount || 0),
    [payer, setPayer] = useState(value?.payerId || identity),
    [ids, setIds] = useState(value?.shares.map((x) => x.memberId) || g.members.map((m) => m.id));
  const validAmount = Number.isSafeInteger(amount) && amount > 0 && amount <= 1_000_000_000_000;
  const shares = validAmount && ids.length ? splitEvenly(amount, ids) : [];
  return (
    <Modal
      className={s.expenseDialog}
      title={value ? translate("Chỉnh sửa khoản chi") : translate("Thêm khoản chi")}
      onClose={onClose}
      footer={
        <div className={s.saveActions}>
          <Button loading={busy} type="submit" form={formId} disabled={busy || !ids.length || !validAmount}>
            {busy ? translate("Đang lưu…") : translate("Lưu khoản chi")}
          </Button>
        </div>
      }
    >
      {alert}
      <Form
        id={formId}
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
        <Field label={translate("Tên khoản chi")}>
          <Input
            name="title"
            defaultValue={value?.title}
            placeholder={translate("Ví dụ: Ăn tối")}
            required
            maxLength={200}
          />
        </Field>
        <Field label={translate("Số tiền (₫)")}>
          <MoneyInput value={amount} onValueChange={setAmount} required aria-label={translate("Số tiền")} />
        </Field>
        <div className={s.grid2}>
          <DateInput label={translate("Ngày")} name="date" defaultValue={value?.date || today()} required />
          <Field label={translate("Người trả tiền")}>
            <MemberSelect g={g} value={payer} onChange={setPayer} label={translate("Người trả tiền")} />
          </Field>
        </div>
        <details className={s.splitPicker}>
          <summary className={s.splitSummary}>
            <strong>Chia cho</strong>
            <span>{ids.length} {translate("người đã chọn")}</span>
            <ChevronDownIcon />
          </summary>
          <div className={s.splitList}>
            <label className={s.splitRow}>
              <input
                type="checkbox"
                checked={ids.length === g.members.length}
                onChange={(e) => setIds(e.target.checked ? g.members.map((m) => m.id) : [])}
              />
              {translate("Tất cả thành viên")}
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
        </details>
        <p className={s.notice}>
          {ids.length
            ? `${translate("Chia đều · khoảng")} ${money(Math.floor(amount / ids.length))} ${translate("/ người")}`
            : translate("Chọn ít nhất một người cùng chia.")}
        </p>
        <Field label={translate("Ghi chú (không bắt buộc)")}>
          <Input name="note" defaultValue={value?.note} maxLength={1000} />
        </Field>
      </Form>
    </Modal>
  );
}
