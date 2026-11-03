import { t as translate } from './app/i18n/language';
import { Button, LoadingIndicator } from '@tingting/design-system';
import { useTingting, type TingtingModel } from './app/hooks/useTingting';
import LoginScreen from './features/admin/LoginScreen';
import DashboardScreen from './features/admin/DashboardScreen';
import JoinScreen from './features/identity/JoinScreen';
import GroupScreen from './features/groups/GroupScreen';
import GroupModal from './features/groups/GroupModal';
import DesignPreview from './features/design-preview/DesignPreview';
import AppHeader from './app/components/AppHeader';
import AccessManager from './features/admin/AccessManager';
import TeamsScreen from './features/teams/TeamsScreen';
import { useLanguage } from './app/i18n/language';
import s from './App.module.css';
export default function App() {
  useLanguage();
  const model = useTingting();
  if (model.preview) return <DesignPreview />;
  return (
    <div className={s.shell}>
      {(model.viewer || model.token) && <AppHeader model={model} />}
      {model.refreshFailed && (
        <div className={s.refreshNotice} role="status">
          <span>{translate("Chưa thể cập nhật. Đang hiển thị dữ liệu đã tải.")}</span>
          <RetryActions model={model} compact />
        </div>
      )}
      <CurrentScreen model={model} />
      <GroupModal model={model} />
      {model.toast && (
        <div role="status" className={s.toast}>
          {model.toast}
        </div>
      )}
    </div>
  );
}
function CurrentScreen({ model }: { model: TingtingModel }) {
  if (model.loading) return (
    <main className={`${s.loadingPage} ${model.viewer || model.token ? s.loadingWithHeader : ''}`}>
      <LoadingIndicator />
    </main>
  );
  if (model.connectionFailed || (model.token && !model.g))
    return (
      <main className={s.page}>
        <p role="alert" className={s.error}>
          {model.error || translate("Không tìm thấy sổ chi tiêu")}
        </p>
        <RetryActions model={model} />
      </main>
    );
  if (model.path === '/admin/access')
    return model.viewer && model.admin ? (
      <AccessManager onChange={model.load} />
    ) : model.viewer ? (
      <DashboardScreen model={model} />
    ) : (
      <LoginScreen model={model} />
    );
  if (model.path === '/teams')
    return model.viewer ? <TeamsScreen model={model} /> : <LoginScreen model={model} />;
  if (!model.token)
    return model.viewer ? <DashboardScreen model={model} /> : <LoginScreen model={model} />;
  if (!model.g) return null;
  return model.viewer || model.identity ? (
    <GroupScreen model={model} g={model.g} />
  ) : (
    <JoinScreen model={model} g={model.g} />
  );
}

function RetryActions({ model, compact = false }: { model: TingtingModel; compact?: boolean }) {
  return (
    <div className={s.retryActions}>
      <Button small={compact} variant={compact ? 'secondary' : undefined} onClick={() => void model.load()}>
        {translate("Thử lại")}
      </Button>
      {model.connectionDetails && (
        <Button small variant="secondary" onClick={() => void model.copyConnectionDetails()}>
          {translate("Sao chép thông tin lỗi")}
        </Button>
      )}
    </div>
  );
}
