import type { FormEvent, ReactNode } from 'react';
import type { Group } from '../types';
import MemberPicker from './MemberPicker';
import s from './forms.module.css';
export const name = (g: Group, id: string) =>
  g.members.find((m) => m.id === id)?.name || 'Thành viên';
export const short = (g: Group, id: string) => name(g, id).split(' ')[0];
export const err = (e: unknown) => (e instanceof Error ? e.message : 'Có lỗi xảy ra');
export function Form({
  onSubmit,
  children,
  className = '',
  id,
}: {
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <form id={id} className={`${s.form} ${className}`} onSubmit={onSubmit}>
      {children}
    </form>
  );
}
export function MemberSelect({
  g,
  value,
  onChange,
  exclude,
  label = 'Chọn thành viên',
}: {
  g: Group;
  value: string;
  onChange: (id: string) => void;
  exclude?: string;
  label?: string;
}) {
  return (
    <MemberPicker
      options={g.members
        .filter((member) => member.id !== exclude)
        .map((member) => ({ id: member.id, label: member.name }))}
      value={value}
      onChange={onChange}
      label={label}
    />
  );
}
