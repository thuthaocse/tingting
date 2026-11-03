import { useState } from 'react';
import { Button, Field, Input } from '@tingting/design-system';
import type { Group, Member } from '../../types';
import type { Viewer } from '../../api';
import type { Team } from '../../api';
import { Form } from '../../shared/forms';
import s from './GroupForm.module.css';
export default function GroupForm({
  value,
  viewer,
  teams = [],
  formId,
  busy,
  onSave,
}: {
  value?: Group;
  viewer?: Viewer;
  teams?: Team[];
  formId?: string;
  busy: boolean;
  onSave: (x: unknown) => void;
}) {
  const [members, setMembers] = useState<Member[]>(
    value?.members || [
      { id: crypto.randomUUID(), name: viewer?.name || '', email: viewer?.email || '' },
    ],
  );
  const [teamSearch, setTeamSearch] = useState('');
  const searchKey = teamSearch.trim().toLocaleLowerCase('vi');
  const matchingTeams = teams.filter(
    (team) =>
      team.name.toLocaleLowerCase('vi').includes(searchKey) ||
      team.members.some((member) => member.name.toLocaleLowerCase('vi').includes(searchKey)),
  );
  return (
    <Form
      id={formId}
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        onSave({
          name: f.get('name'),
          description: f.get('description'),
          members: [...members]
            .reduce<Member[]>((all, member) => {
              const email = member.email?.toLowerCase();
              if (
                all.some(
                  (item) => item.id === member.id || (email && item.email?.toLowerCase() === email),
                )
              )
                return all;
              all.push(member);
              return all;
            }, [])
            .map((member) => ({ ...member, email: member.email || '' })),
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
      {teams.length > 0 && (
        <div className={s.teamPicker}>
          <Field label="Thêm thành viên từ team">
            <Input
              aria-label="Tìm team hoặc thành viên"
              placeholder="Tìm theo tên team hoặc thành viên…"
              value={teamSearch}
              onChange={(event) => setTeamSearch(event.target.value)}
            />
          </Field>
          <div className={s.teamList}>
            {matchingTeams.map((team) => {
              const teamMatchesSearch = team.name.toLocaleLowerCase('vi').includes(searchKey);
              const visibleMembers =
                searchKey && !teamMatchesSearch
                  ? team.members.filter((member) =>
                      member.name.toLocaleLowerCase('vi').includes(searchKey),
                    )
                  : team.members;
              return (
                <details key={team.id} className={s.teamOption}>
                  <summary>
                    <span>{team.name}</span>
                    <small>{team.members.length} thành viên</small>
                  </summary>
                  <div className={s.teamMembers}>
                    {!searchKey || teamMatchesSearch ? (
                      <button
                        type="button"
                        className={s.addTeamButton}
                        onClick={() => setMembers((current) => addMembers(current, visibleMembers))}
                      >
                        + Thêm cả team
                      </button>
                    ) : null}
                    {visibleMembers.map((member) => {
                      const alreadyAdded = members.some((existing) => sameMember(existing, member));
                      return (
                        <button
                          type="button"
                          className={s.teamMember}
                          key={memberKey(member)}
                          disabled={alreadyAdded}
                          onClick={() => setMembers((current) => addMembers(current, [member]))}
                        >
                          <span>{member.name}{alreadyAdded ? ' · Đã thêm' : ''}</span>
                          {member.email && <small>{member.email}</small>}
                          {!alreadyAdded && <span className={s.addMemberIcon}>+</span>}
                        </button>
                      );
                    })}
                  </div>
                </details>
              );
            })}
            {!matchingTeams.length && (
              <p className={s.noTeamResults}>Không tìm thấy team hoặc thành viên.</p>
            )}
          </div>
        </div>
      )}
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
      {!formId && (
        <Button disabled={busy}>
          {busy ? 'Đang lưu…' : value ? 'Lưu thay đổi' : 'Tạo nhóm & lấy liên kết'}
        </Button>
      )}
    </Form>
  );
}

function memberKey(member: Member): string {
  return member.email?.trim().toLowerCase() || `id:${member.id}`;
}

function addMembers(current: Member[], additions: Member[]): Member[] {
  return additions.reduce((members, member) => {
    if (members.some((existing) => sameMember(existing, member))) return members;
    return [...members, { ...member }];
  }, current);
}

function sameMember(a: Member, b: Member): boolean {
  return a.id === b.id || (!!a.email && a.email.trim().toLowerCase() === b.email?.trim().toLowerCase());
}
