import { Avatar, Button, Logo, LogoutIcon, MenuIcon } from '@tingting/design-system';
import type { TingtingModel } from '../hooks/useTingting';
import { useHeaderMenu } from '../hooks/useHeaderMenu';
import s from './AppHeader.module.css';
export default function AppHeader({ model }: { model: TingtingModel }) {
  const { menuRef, close } = useHeaderMenu();
  return (
    <header className={s.topbar}>
      <Logo />
      {model.viewer ? (
        <>
          <div className={s.desktopActions}>
            <HeaderActions model={model} />
          </div>
          <TeamsLink model={model} className={s.mobileTeamsLink} />
          <details ref={menuRef} className={s.mobileMenu}>
            <summary aria-label="Menu tài khoản" title="Menu tài khoản">
              <MenuIcon />
            </summary>
            <div className={s.menuPanel} onClick={close}>
              <HeaderActions model={model} />
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
function HeaderActions({ model }: { model: TingtingModel }) {
  return (
    <div className={s.actions}>
      {model.viewer && (
        <>
          <TeamsLink model={model} className={s.teamsLink} />
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

    </div>
  );
}

function TeamsLink({ model, className }: { model: TingtingModel; className: string }) {
  return (
    <a
      className={className}
      href="/teams"
      onClick={(event) => {
        event.preventDefault();
        model.navigate('/teams');
      }}
    >
      Teams
    </a>
  );
}
