import { Avatar, Button, Logo, LogoutIcon, MenuIcon, MoonIcon, SunIcon } from '@tingting/design-system';
import type { TingtingModel } from '../hooks/useTingting';
import { useTheme } from '../hooks/useTheme';
import { useHeaderMenu } from '../hooks/useHeaderMenu';
import s from './AppHeader.module.css';
export default function AppHeader({ model }: { model: TingtingModel }) {
  const { menuRef, close } = useHeaderMenu();
  const { theme, toggleTheme } = useTheme();
  return (
    <header className={s.topbar}>
      <div className={s.brandNavigation}>
        <Logo />
        {model.viewer && <div className={s.desktopNavigation}><Navigation model={model} /></div>}
      </div>
      {model.viewer ? (
        <>
          <div className={s.desktopActions}>
            <div className={s.actions}><ThemeButton theme={theme} onToggle={toggleTheme} /><Account model={model} /><Logout model={model} /></div>
          </div>
          <details ref={menuRef} className={s.mobileMenu}>
            <summary aria-label="Menu" title="Menu">
              <MenuIcon />
            </summary>
            <div className={s.menuPanel} onClick={close}>
              <div className={s.actions}>
                <Account model={model} />
                <Navigation model={model} />
                <ThemeButton theme={theme} onToggle={toggleTheme} />
                <Logout model={model} />
              </div>
            </div>
          </details>
        </>
      ) : model.g && (
        <div className={s.actions}>
          <ThemeButton theme={theme} onToggle={toggleTheme} />
          <Button disabled={!model.googleEnabled} onClick={model.login}>Đăng nhập</Button>
        </div>
      )}
    </header>
  );
}
function Navigation({ model }: { model: TingtingModel }) {
  return (
    <nav className={s.navigation} aria-label="Điều hướng chính">
      <a href="/" aria-current={model.path === '/' ? 'page' : undefined}>Sổ chi tiêu</a>
      <a href="/teams" aria-current={model.path === '/teams' ? 'page' : undefined}>Hội nhóm</a>
      {model.admin && <a href="/admin/access" aria-current={model.path === '/admin/access' ? 'page' : undefined}>Tài khoản</a>}
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

function ThemeButton({ theme, onToggle }: { theme: 'light' | 'dark'; onToggle: () => void }) {
  const label = theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối';
  return (
    <Button type="button" variant="quiet" className={`${s.iconButton} ${s.themeButton}`} aria-label={label} title={label} onClick={onToggle}>
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
      <span className={s.themeLabel}>{theme === 'dark' ? 'Giao diện sáng' : 'Giao diện tối'}</span>
    </Button>
  );
}
