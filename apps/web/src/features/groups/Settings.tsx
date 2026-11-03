import { Button, CopyIcon } from '@tingting/design-system';
import type { Group } from '../../types';
import type { Team } from '../../api';
import GroupForm from './GroupForm';
import s from './Settings.module.css';
export default function Settings({
  g,
  teams = [],
  busy,
  onSave,
  onRotate,
  onCopy,
}: {
  g: Group;
  teams?: Team[];
  busy: boolean;
  onSave: (x: unknown) => void;
  onRotate: () => void;
  onCopy: () => void;
}) {
  return (
    <div className={s.form}>
      <Button variant="secondary" small className={s.copyLink} onClick={onCopy}>
        <CopyIcon />
        Sao chép liên kết nhóm
      </Button>
      {
        <>
          <GroupForm value={g} teams={teams} busy={busy} onSave={onSave} />
          <Button variant="secondary" disabled={busy} onClick={onRotate}>
            Đổi liên kết chia sẻ
          </Button>
        </>
      }
    </div>
  );
}
