import { t as translate } from '../../app/i18n/language';
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
  onCopy,
  formId,
}: {
  g: Group;
  teams?: Team[];
  busy: boolean;
  onSave: (x: unknown) => void;
  onCopy: () => void;
  formId: string;
}) {
  return (
    <div className={s.form}>
      <Button variant="secondary" small className={s.copyLink} onClick={onCopy}>
        <CopyIcon />
        {translate("Sao chép liên kết sổ")}
      </Button>
      <GroupForm formId={formId} value={g} teams={teams} busy={busy} onSave={onSave} />
    </div>
  );
}
