import { Button } from '@tingting/design-system';
import type { Group } from '../../types';
import GroupForm from './GroupForm';
import s from './Settings.module.css';
export default function Settings({
  g,
  busy,
  onSave,
  onRotate,
  onArchive,
  onCopy,
}: {
  g: Group;
  busy: boolean;
  onSave: (x: unknown) => void;
  onRotate: () => void;
  onArchive: () => void;
  onCopy: () => void;
}) {
  return (
    <div className={s.form}>
      <Button variant="secondary" onClick={onCopy}>
        Sao chép liên kết nhóm
      </Button>
      {
        <>
          <GroupForm value={g} busy={busy} onSave={onSave} />
          <Button variant="secondary" disabled={busy} onClick={onRotate}>
            Đổi liên kết chia sẻ
          </Button>
          <Button variant="danger" disabled={busy} onClick={onArchive}>
            {g.archived ? 'Mở lại nhóm' : 'Lưu trữ nhóm'}
          </Button>
        </>
      }
    </div>
  );
}
