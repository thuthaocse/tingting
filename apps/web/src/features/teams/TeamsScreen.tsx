import { Button, Modal } from '@tingting/design-system';
import type { TingtingModel } from '../../app/hooks/useTingting';
import TeamForm from './TeamForm';
import s from './Teams.module.css';

export default function TeamsScreen({ model }: { model: TingtingModel }) {
  return (
    <main className={s.page}>
      <div className={s.heading}>
        <div><p className={s.eyebrow}>NHÓM CỦA BẠN</p><h1>Teams</h1></div>
        <Button onClick={() => model.openTeamEditor()}>+ Tạo team</Button>
      </div>
      {model.teamsError && (
        <div className={s.error}>
          <p role="alert">{model.teamsError}</p>
          <Button variant="quiet" small onClick={() => void model.load()}>
            Thử lại
          </Button>
        </div>
      )}
      <p className={s.muted}>Các team có email của bạn trong danh sách thành viên.</p>
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
      {!model.teamsError && !model.teams.length && <p className={s.empty}>Bạn chưa tham gia team nào. Tạo team và thêm thành viên bằng tên, email.</p>}
      {model.teamModal && model.viewer && (
        <Modal title={model.teamToEdit ? 'Quản lý team' : 'Tạo team'} onClose={model.closeTeamEditor}>
          {model.teamEditorError && <p role="alert" className={s.error}>{model.teamEditorError}</p>}
          <TeamForm
            team={model.teamToEdit}
            viewer={model.viewer}
            busy={model.busy}
            onCancel={model.closeTeamEditor}
            onSave={(name, members) => void model.saveTeam(name, members)}
            onDelete={() => {
              if (model.teamToEdit && confirm('Xóa team này?')) void model.deleteTeam();
            }}
          />
        </Modal>
      )}
    </main>
  );
}
