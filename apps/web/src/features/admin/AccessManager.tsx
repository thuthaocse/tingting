import { Button, Field, Input, SearchSelect } from '@tingting/design-system';
import { useAccessManager } from './hooks/useAccessManager';
import s from './AccessManager.module.css';
const roles = [
  { id: 'creator', label: 'Chỉ tạo nhóm' },
  { id: 'admin', label: 'Admin' },
];
export default function AccessManager({ onChange }: { onChange: () => Promise<void> }) {
  const access = useAccessManager(onChange);
  return (
    <details className={s.panel} onToggle={(event) => access.setOpen(event.currentTarget.open)}>
      <summary>Quản lý quyền tạo nhóm</summary>
      <div className={s.body}>
        <p>Thêm email để cấp quyền. Người được thêm đăng nhập Google bằng email này.</p>
        {access.error && (
          <p role="alert" className={s.error}>
            {access.error}
          </p>
        )}
        <form
          className={s.form}
          onSubmit={(event) => {
            event.preventDefault();
            void access.save(access.email, access.role);
          }}
        >
          <Field label="Email">
            <Input
              type="email"
              required
              value={access.email}
              onChange={(event) => access.setEmail(event.target.value)}
              placeholder="ten@gmail.com"
            />
          </Field>
          <Field label="Vai trò">
            <SearchSelect
              label="Vai trò được cấp"
              options={roles}
              value={access.role}
              onChange={access.setRole}
            />
          </Field>
          <Button disabled={access.busy}>Thêm quyền</Button>
        </form>
        <div className={s.root}>
          <span>thuthao.cse@gmail.com</span>
          <strong>Admin gốc</strong>
        </div>
        {access.grants.map((grant) => (
          <div key={grant.email} className={s.row}>
            <span className={s.email}>{grant.email}</span>
            <SearchSelect
              label={`Vai trò của ${grant.email}`}
              options={roles}
              value={grant.role}
              onChange={(role) => void access.save(grant.email, role)}
            />
            <Button
              variant="quiet"
              small
              disabled={access.busy}
              onClick={() => void access.save(grant.email, null)}
            >
              Thu hồi
            </Button>
          </div>
        ))}
      </div>
    </details>
  );
}
