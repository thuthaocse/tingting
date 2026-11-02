import { useState } from 'react';
import { Button, Field, Input } from '@tingting/design-system';
import type { Group, Member } from '../../types';
import { Form } from '../../shared/forms';
import s from './GroupForm.module.css';
export default function GroupForm({
  value,
  busy,
  onSave,
}: {
  value?: Group;
  busy: boolean;
  onSave: (x: unknown) => void;
}) {
  const [members, setMembers] = useState<Member[]>(
    value?.members || [{ id: crypto.randomUUID(), name: '', email: '' }],
  );
  return (
    <Form
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        onSave({
          name: f.get('name'),
          description: f.get('description'),
          members: members.map((m) => ({ ...m, email: m.email || '' })),
        });
      }}
    >
      <Field label="Tên nhóm">
        <Input
          name="name"
          defaultValue={value?.name}
          placeholder="Ví dụ: Đà Lạt cuối tuần"
          maxLength={120}
          required
        />
      </Field>
      <Field label="Mô tả (không bắt buộc)">
        <Input name="description" defaultValue={value?.description} maxLength={500} />
      </Field>
      <Field label="Tiền tệ">
        <select className={s.select} disabled>
          <option>VND — Việt Nam đồng</option>
        </select>
      </Field>
      <div className={s.formTitle}>
        <h3>Thành viên</h3>
        <span className={s.muted}>{members.length} người</span>
      </div>
      {members.map((m, i) => (
        <div key={m.id} className={s.memberEdit}>
          <Input
            aria-label={`Tên thành viên ${i + 1}`}
            placeholder="Họ và tên"
            required
            maxLength={100}
            value={m.name}
            onChange={(e) =>
              setMembers(members.map((x) => (x.id === m.id ? { ...x, name: e.target.value } : x)))
            }
          />
          <Input
            aria-label={`Email thành viên ${i + 1}`}
            type="email"
            placeholder="Email (tùy chọn)"
            value={m.email || ''}
            onChange={(e) =>
              setMembers(members.map((x) => (x.id === m.id ? { ...x, email: e.target.value } : x)))
            }
          />
          <Button
            type="button"
            variant="quiet"
            aria-label={`Xóa ${m.name || 'thành viên'}`}
            disabled={members.length === 1}
            onClick={() => setMembers(members.filter((x) => x.id !== m.id))}
          >
            ✕
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        onClick={() => setMembers([...members, { id: crypto.randomUUID(), name: '', email: '' }])}
      >
        + Thêm thành viên
      </Button>
      <small>Thành viên sẽ chọn tên khi mở liên kết nhóm.</small>
      <Button disabled={busy}>
        {busy ? 'Đang lưu…' : value ? 'Lưu thay đổi' : 'Tạo nhóm & lấy liên kết'}
      </Button>
    </Form>
  );
}
