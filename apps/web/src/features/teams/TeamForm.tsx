import { t as translate } from '../../app/i18n/language';
import { Button, Field, Input } from '@tingting/design-system';
import { useState } from 'react';
import type { Team, Viewer } from '../../graphql/generated';
import type { Member } from '../../types';
import { Form } from '../../shared/forms';
import s from './Teams.module.css';

export default function TeamForm({
  team,
  viewer,
  busy,
  onSave,
  onDelete,
  onCancel,
}: {
  team?: Team;
  viewer: Viewer;
  busy: boolean;
  onSave: (name: string, members: Member[]) => void;
  onDelete: () => void;
  onCancel: () => void;
}) {
  const [members, setMembers] = useState<Member[]>(
    team?.members || [{ id: viewer.id, name: viewer.name, email: viewer.email }],
  );
  const isTeamEmpty = Boolean(team && !members.length);
  return (
    <Form
      onSubmit={(event) => {
        event.preventDefault();
        if (isTeamEmpty) {
          onDelete();
          return;
        }
        const data = new FormData(event.currentTarget);
        onSave(String(data.get('name') || ''), members);
      }}
    >
      <Field label={translate("Tên hội nhóm")}>
        <Input
          name="name"
          defaultValue={team?.name}
          placeholder={translate("Ví dụ: Gia đình")}
          maxLength={120}
          required
        />
      </Field>
      <div className={s.membersHeading}>
        <h3>{translate("Thành viên")}</h3>
        <span>{members.length} {translate("người")}</span>
      </div>
      {members.map((member, index) => {
        const isOwner = isViewerMember(member, viewer);
        const canRemove = team ? !isOwner || members.length === 1 : !isOwner;
        return (
          <div className={s.memberRow} key={member.id}>
            <Input
              aria-label={`${translate("Tên thành viên")} ${index + 1}`}
              placeholder={translate("Họ và tên")}
              required
              maxLength={100}
              value={member.name}
              onChange={(event) =>
                setMembers((items) =>
                  items.map((item) =>
                    item.id === member.id ? { ...item, name: event.target.value } : item,
                  ),
                )
              }
            />
            <Input
              aria-label={`${translate("Email thành viên")} ${index + 1}`}
              placeholder={translate("Email (không bắt buộc)")}
              type="email"
              disabled={isOwner}
              value={member.email || ''}
              onChange={(event) =>
                setMembers((items) =>
                  items.map((item) =>
                    item.id === member.id ? { ...item, email: event.target.value } : item,
                  ),
                )
              }
            />
            <Button
              type="button"
              variant="quiet"
              aria-label={`${translate("Xóa")} ${member.name}`}
              disabled={!canRemove}
              onClick={() => setMembers((items) => items.filter((item) => item.id !== member.id))}
            >
              ×
            </Button>
          </div>
        );
      })}
      <Button
        type="button"
        variant="secondary"
        onClick={() =>
          setMembers((items) => [...items, { id: crypto.randomUUID(), name: '', email: '' }])
        }
      >
        {translate("+ Thêm thành viên")}
      </Button>
      <div className={s.formActions}>
        <Button
          type="button"
          className={isTeamEmpty ? s.fullWidthAction : undefined}
          variant="secondary"
          disabled={busy}
          onClick={onCancel}
        >
          {translate("Hủy")}
        </Button>
        {!isTeamEmpty && (
          <Button loading={busy} disabled={busy}>
            {busy ? translate("Đang lưu…") : team ? translate("Lưu thay đổi") : translate("Tạo hội nhóm")}
          </Button>
        )}
        {team && (
          <Button
            type="button"
            className={s.fullWidthAction}
            variant="danger"
            disabled={busy}
            onClick={onDelete}
          >
            {translate("Xóa hội nhóm")}
          </Button>
        )}
      </div>
    </Form>
  );
}

function isViewerMember(member: Member, viewer: Viewer): boolean {
  return member.id === viewer.id || member.email?.toLowerCase() === viewer.email.toLowerCase();
}
