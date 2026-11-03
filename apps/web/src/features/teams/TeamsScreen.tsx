import { Button, Modal } from '@tingting/design-system';
import type { TingtingModel } from '../../app/hooks/useTingting';
import EmptyState from '../../shared/empty-state/EmptyState';
import TeamForm from './TeamForm';
import s from './Teams.module.css';

export default function TeamsScreen({ model }: { model: TingtingModel }) {
  return (
    <main className={s.page}>
      <div className={s.heading}>
        <div><p className={s.eyebrow}>CỘNG ĐỒNG CỦA BẠN</p><h1>Hội nhóm</h1></div>
        <Button onClick={() => model.openTeamEditor()}>+ Tạo hội nhóm</Button>
      </div>
      {model.teamsError && (
        <div className={s.error}>
          <p role="alert">{model.teamsError}</p>
          <Button variant="quiet" small onClick={() => void model.load()}>
            Thử lại
          </Button>
        </div>
      )}
      <p className={s.muted}>Lưu hội nhóm để thêm nhanh vào các sổ chi tiêu. Bạn thấy các hội nhóm có email của mình.</p>
      <div className={s.teamGrid}>
        {model.teams.map((team) => (
          <article className={s.card} key={team.id}>
            <div className={s.cardHeading}><div><h2>{team.name}</h2><p>{team.members.length} thành viên</p></div>
              {team.ownerEmail.toLowerCase() === model.viewer?.email.toLowerCase() && <Button variant="secondary" small onClick={() => model.openTeamEditor(team)}>Quản lý</Button>}
            </div>
            <ul>{team.members.map((member) => <li key={member.id}><span>{member.name}</span><small>{member.email}</small></li>)}</ul>
          </article>
        ))}
      </div>
      {!model.teamsError && !model.teams.length && <EmptyState><p>Bạn chưa có hội nhóm nào. Tạo hội nhóm để thêm nhanh mọi người vào sổ chi tiêu.</p></EmptyState>}
      {model.teamModal && model.viewer && (
        <Modal title={model.teamToEdit ? 'Quản lý hội nhóm' : 'Tạo hội nhóm'} onClose={model.closeTeamEditor}>
          {model.teamEditorError && <p role="alert" className={s.error}>{model.teamEditorError}</p>}
          <TeamForm
            team={model.teamToEdit}
            viewer={model.viewer}
            busy={model.busy}
            onCancel={model.closeTeamEditor}
            onSave={(name, members) => void model.saveTeam(name, members)}
            onDelete={() => {
              if (model.teamToEdit && confirm('Xóa hội nhóm này?')) void model.deleteTeam();
            }}
          />
        </Modal>
      )}
    </main>
  );
}
