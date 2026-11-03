import { t as translate } from '../../app/i18n/language';
import { useState } from 'react';
import { Avatar, Button, Input } from '@tingting/design-system';
import type { Group } from '../../types';
import { Form } from '../../shared/forms';
import s from './IdentityPicker.module.css';
export default function IdentityPicker({
  g,
  onChoose,
}: {
  g: Group;
  onChoose: (id: string) => void;
}) {
  const [q, setQ] = useState(''),
    [id, setId] = useState('');
  return (
    <Form
      className={s.form}
      onSubmit={(e) => {
        e.preventDefault();
        onChoose(id);
      }}
    >
      <Input
        placeholder={translate("Tìm tên của bạn…")}
        aria-label={translate("Tìm tên của bạn")}
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className={s.memberList} role="radiogroup" aria-label={translate("Chọn tên của bạn")}>
        {g.members
          .filter((m) => m.name.toLowerCase().includes(q.toLowerCase()))
          .map((m) => (
            <label key={m.id} className={`${s.memberRow} ${id === m.id ? s.selected : ''}`}>
              <Avatar name={m.name} />
              <span>{m.name}</span>
              <input
                type="radio"
                name="identity"
                checked={id === m.id}
                onChange={() => setId(m.id)}
              />
            </label>
          ))}
      </div>
      <Button disabled={!id}>{translate("Tiếp tục →")}</Button>
    </Form>
  );
}
