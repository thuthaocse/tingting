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
import s from './App.module.css';
export default function App() {
  const model = useTingting();
  if (model.preview) return <DesignPreview />;
  return (
    <div className={s.shell}>
      {(model.viewer || model.token) && <AppHeader model={model} />}
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
  if (model.loading) return <LoadingIndicator />;
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
  if (!model.g)
    return (
      <main className={s.page}>
        <p role="alert" className={s.error}>
          {model.error || 'Không tìm thấy sổ chi tiêu'}
        </p>
        <Button onClick={() => void model.load()}>Thử lại</Button>
      </main>
    );
  return model.viewer || model.identity ? (
    <GroupScreen model={model} g={model.g} />
  ) : (
    <JoinScreen model={model} g={model.g} />
  );
}
