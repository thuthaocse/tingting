import { SearchSelect } from '@tingting/design-system';
import type { FormEvent, ReactNode } from 'react';
import type { Group } from '../types';
import s from './forms.module.css';
export const name = (g: Group, id: string) =>
  g.members.find((m) => m.id === id)?.name || 'Thành viên';
export const short = (g: Group, id: string) => name(g, id).split(' ')[0];
export const err = (e: unknown) => (e instanceof Error ? e.message : 'Có lỗi xảy ra');
export function Form({
  onSubmit,
  children,
  className = '',
}: {
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <form className={`${s.form} ${className}`} onSubmit={onSubmit}>
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
    <SearchSelect
      options={g.members
        .filter((member) => member.id !== exclude)
        .map((member) => ({ id: member.id, label: member.name }))}
      value={value}
      onChange={onChange}
      label={label}
      placeholder="Chọn thành viên"
      searchPlaceholder="Tìm theo tên…"
    />
  );
}
