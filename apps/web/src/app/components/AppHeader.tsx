import { t as translate } from '../i18n/language';
import { Avatar, Button, Logo, LogoutIcon, MenuIcon, MoonIcon, SunIcon } from '@tingting/design-system';
import type { TingtingModel } from '../hooks/useTingting';
import { useTheme } from '../hooks/useTheme';
import { useHeaderMenu } from '../hooks/useHeaderMenu';
import LanguageSelect from './LanguageSelect';
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
            <div className={s.actions}><LanguageSelect /><ThemeButton theme={theme} onToggle={toggleTheme} /><Account model={model} /><Logout model={model} /></div>
          </div>
          <details ref={menuRef} className={s.mobileMenu}>
            <summary aria-label="Menu" title="Menu">
              <MenuIcon />
            </summary>
            <div className={s.menuPanel} onClick={(event) => {
              if ((event.target as HTMLElement).closest('a, button')) close();
            }}>
              <div className={s.actions}>
                <Account model={model} />
                <Navigation model={model} />
                <LanguageSelect align="start" showLabel />
                <ThemeButton theme={theme} onToggle={toggleTheme} />
                <Logout model={model} />
              </div>
            </div>
          </details>
        </>
      ) : model.g && (
        <div className={s.actions}>
          <LanguageSelect />
          <ThemeButton theme={theme} onToggle={toggleTheme} />
          <Button disabled={!model.googleEnabled} onClick={model.login}>{translate("Đăng nhập")}</Button>
        </div>
      )}
    </header>
  );
}
function Navigation({ model }: { model: TingtingModel }) {
  return (
    <nav className={s.navigation} aria-label={translate("Điều hướng chính")}>
      <a href="/" aria-current={model.path === '/' ? 'page' : undefined}>{translate("Sổ chi tiêu")}</a>
      <a href="/teams" aria-current={model.path === '/teams' ? 'page' : undefined}>{translate("Hội nhóm")}</a>
      {model.admin && <a href="/admin/access" aria-current={model.path === '/admin/access' ? 'page' : undefined}>{translate("Tài khoản")}</a>}
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
    <Button variant="quiet" small className={s.iconButton} aria-label={translate("Đăng xuất")} title={translate("Đăng xuất")} onClick={() => void model.logout()}>
      <LogoutIcon />
      <span className={s.logoutLabel}>{translate("Đăng xuất")}</span>
    </Button>
  );
}

function ThemeButton({ theme, onToggle }: { theme: 'light' | 'dark'; onToggle: () => void }) {
  const label = theme === 'dark' ? translate("Chuyển sang giao diện sáng") : translate("Chuyển sang giao diện tối");
  return (
    <Button type="button" variant="quiet" className={`${s.iconButton} ${s.themeButton}`} aria-label={label} title={label} onClick={onToggle}>
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
      <span className={s.themeLabel}>{theme === 'dark' ? translate("Giao diện sáng") : translate("Giao diện tối")}</span>
    </Button>
  );
}
