import { t as translate } from '../../app/i18n/language';
import { Badge } from '@tingting/design-system';
import type { Group } from '../../types';
import IdentityPicker from './IdentityPicker';
import type { TingtingModel } from '../../app/hooks/useTingting';
import s from './JoinScreen.module.css';
export default function JoinScreen({ model, g }: { model: TingtingModel; g: Group }) {
  const { choose } = model;
  return (
    <main className={s.center}>
      <div className={`${s.card} ${s.welcome}`}>
        <div className={s.groupContext}>
          <span className={s.groupName} title={g.name}>
            {g.name}
          </span>
          <Badge>{g.members.length} {translate("thành viên")}</Badge>
        </div>
        <h1>{translate("Bạn là ai?")}</h1>
        <p className={s.muted}>{translate("Chọn tên từ danh sách quản trị viên đã tạo.")}</p>
        <IdentityPicker g={g} onChoose={choose} />
        <p className={s.footer}>{translate("Không thấy tên của bạn? Liên hệ quản trị viên.")}</p>
      </div>
    </main>
  );
}
