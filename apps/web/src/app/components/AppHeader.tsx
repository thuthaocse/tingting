import { Avatar, Button, Logo, LogoutIcon, MenuIcon } from '@tingting/design-system';
import type { TingtingModel } from '../hooks/useTingting';
import { useHeaderMenu } from '../hooks/useHeaderMenu';
import s from './AppHeader.module.css';
export default function AppHeader({ model }: { model: TingtingModel }) {
  const { menuRef, close } = useHeaderMenu();
  return (
    <header className={s.topbar}>
      <Logo />
      <div className={s.desktopActions}>
        <HeaderActions model={model} />
      </div>
      <details ref={menuRef} className={s.mobileMenu}>
        <summary aria-label="Menu tài khoản" title="Menu tài khoản">
          <MenuIcon />
        </summary>
        <div className={s.menuPanel} onClick={close}>
          <HeaderActions model={model} />
        </div>
      </details>
    </header>
  );
}
function HeaderActions({ model }: { model: TingtingModel }) {
  return (
    <div className={s.actions}>
      {model.viewer && (
        <>
          <div className={s.account}>
            <Avatar name={model.viewer.name} />
            <span className={s.accountName} title={model.viewer.name}>
              {model.viewer.name}
            </span>
          </div>
          <Button
            variant="quiet"
            small
            className={s.iconButton}
            aria-label="Đăng xuất"
            title="Đăng xuất"
            onClick={() => void model.logout()}
          >
            <LogoutIcon />
            <span className={s.logoutLabel}>Đăng xuất</span>
          </Button>
        </>
      )}
      {!model.viewer && model.g && (
        <Button small disabled={!model.googleEnabled} onClick={model.login}>
          Đăng nhập
        </Button>
      )}
    </div>
  );
}
