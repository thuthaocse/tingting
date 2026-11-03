import { Avatar, Button, Logo, LogoutIcon, MenuIcon } from '@tingting/design-system';
import type { TingtingModel } from '../hooks/useTingting';
import { useHeaderMenu } from '../hooks/useHeaderMenu';
import s from './AppHeader.module.css';
export default function AppHeader({ model }: { model: TingtingModel }) {
  const { menuRef, close } = useHeaderMenu();
  return (
    <header className={s.topbar}>
      <div className={s.brandNavigation}>
        <Logo />
        {model.viewer && <div className={s.desktopNavigation}><Navigation model={model} /></div>}
      </div>
      {model.viewer ? (
        <>
          <div className={s.desktopActions}>
            <div className={s.actions}><Account model={model} /><Logout model={model} /></div>
          </div>
          <details ref={menuRef} className={s.mobileMenu}>
            <summary aria-label="Menu" title="Menu">
              <MenuIcon />
            </summary>
            <div className={s.menuPanel} onClick={close}>
              <div className={s.actions}>
                <Account model={model} />
                <Navigation model={model} />
                <Logout model={model} />
              </div>
            </div>
          </details>
        </>
      ) : model.g && (
        <Button disabled={!model.googleEnabled} onClick={model.login}>
          Đăng nhập
        </Button>
      )}
    </header>
  );
}
function Navigation({ model }: { model: TingtingModel }) {
  return (
    <nav className={s.navigation} aria-label="Điều hướng chính">
      <a href="/" aria-current={model.path === '/' ? 'page' : undefined}>Sổ chi tiêu</a>
      <a href="/teams" aria-current={model.path === '/teams' ? 'page' : undefined}>Hội nhóm</a>
    </nav>
  );
}
function Account({ model }: { model: TingtingModel }) {
  if (!model.viewer) return null;
  return (
    <div className={s.account}>
      <Avatar name={model.viewer.name} />
      <span className={s.accountName} title={model.viewer.name}>{model.viewer.name}</span>
    </div>
  );
}
function Logout({ model }: { model: TingtingModel }) {
  return (
    <Button variant="quiet" small className={s.iconButton} aria-label="Đăng xuất" title="Đăng xuất" onClick={() => void model.logout()}>
      <LogoutIcon />
      <span className={s.logoutLabel}>Đăng xuất</span>
    </Button>
  );
}
