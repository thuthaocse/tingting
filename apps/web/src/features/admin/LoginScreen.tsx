import { t as translate } from '../../app/i18n/language';
import { Badge, Button, Logo } from '@tingting/design-system';
import type { TingtingModel } from '../../app/hooks/useTingting';
import LanguageSelect from '../../app/components/LanguageSelect';
import s from './LoginScreen.module.css';
export default function LoginScreen({ model }: { model: TingtingModel }) {
  return (
    <main className={s.center}>
      <div className={`${s.card} ${s.login}`}>
        <div className={s.brand}>
          <Logo />
        </div>
        <LanguageSelect align="start" />
        <Badge>{translate("CHIA SẺ CHI TIÊU")}</Badge>
        <h1>{translate("Nhẹ tiền, nhẹ lòng.")}</h1>
        <p className={s.muted}>
          {translate("Đăng nhập để xem các sổ chi tiêu, theo dõi khoản nợ và ghi lại chi tiêu cùng nhau.")}
        </p>
        {model.error && (
          <p role="alert" className={s.error}>
            {model.error}
          </p>
        )}
        <Button className={s.loginButton} disabled={!model.googleEnabled} onClick={model.login}>
          {translate("Đăng nhập bằng Google")}
        </Button>
        {!model.googleEnabled && <p className={s.muted}>{translate("Đang chờ cấu hình đăng nhập Google.")}</p>}
        <p className={s.footer}>{translate("Đã có liên kết sổ? Bạn vẫn có thể mở để xem.")}</p>
      </div>
    </main>
  );
}
