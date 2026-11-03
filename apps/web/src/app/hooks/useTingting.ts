import { t as translate } from '../i18n/language';
import { useEffect, useRef, useState } from 'react';
import { useNavigation } from './useNavigation';
import { api, type Viewer, type Dashboard, type Team, type ActivityEvent } from '../../api';
import type { Group, Expense, Settlement, Debt } from '../../types';
import { viewingIdentity } from '../../features/identity/utils/viewing-identity.mjs';
import { err } from '../../shared/forms';
export function useTingting() {
  const { path, navigate } = useNavigation();
  const loadRequest = useRef(0);
  const token = path.match(/^\/g\/([^/]+)/)?.[1];
  const preview = path === '/design-system';
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamToEdit, setTeamToEdit] = useState<Team | undefined>();
  const [teamsError, setTeamsError] = useState('');
  const [teamEditorError, setTeamEditorError] = useState('');
  const [teamModal, setTeamModal] = useState(false);
  const [g, setG] = useState<Group | null>(null),
    [groups, setGroups] = useState<Group[]>([]),
    [admin, setAdmin] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [toast, setToast] = useState(''),
    [identity, setIdentity] = useState(''),
    [tab, setTab] = useState('activity'),
    [simplified, setSimplified] = useState(true),
    [modal, setModal] = useState<string | null>(null),
    [expense, setExpense] = useState<Expense | undefined>(),
    [settlement, setSettlement] = useState<Partial<Settlement> | undefined>(),
    [busy, setBusy] = useState(false),
    [search, setSearch] = useState('');
  const canEdit = !!viewer && !!g?.viewerMemberId;
  const notify = (t: string) => {
    setToast(t);
    window.setTimeout(() => setToast(''), 3500);
  };
  const load = async () => {
    const request = ++loadRequest.current;
    setTeamsError('');
    setError(
      new URLSearchParams(location.search).has('auth_error')
        ? translate("Chưa thể đăng nhập Google. Vui lòng thử lại.")
        : '',
    );
    try {
      const session = await api.session();
      if (request !== loadRequest.current) return;
      setViewer(session.me);
      setAdmin(!!session.me?.isAdmin);
      setGoogleEnabled(session.googleLoginEnabled);
      if (token) {
        const x = await api.group(token);
        if (request !== loadRequest.current) return;
        if (x.token !== token)
          history.replaceState(
            history.state,
            '',
            '/g/' + x.token + location.search + location.hash,
          );
        setG(x);
        setActivityEvents(await api.activity(x.token).catch(() => []));
        const saved =
          localStorage.getItem(`tingting:identity:${x.id}`) ||
          localStorage.getItem(`lilac:identity:${x.id}`) ||
          '';
        setIdentity(viewingIdentity(x, !!session.me, saved));
      } else {
        if (session.me) {
          const [groupsResult, dashboardResult, teamsResult] = await Promise.allSettled([
            api.groups(),
            api.dashboard(),
            api.teams(),
          ]);
          if (request !== loadRequest.current) return;
          if (teamsResult.status === 'fulfilled') setTeams(teamsResult.value);
          else setTeamsError(translate("Không thể tải hội nhóm. Vui lòng thử lại."));
          if (groupsResult.status === 'fulfilled') setGroups(groupsResult.value);
          if (dashboardResult.status === 'fulfilled') setDashboard(dashboardResult.value);
          if (groupsResult.status === 'rejected') throw groupsResult.reason;
          if (dashboardResult.status === 'rejected') throw dashboardResult.reason;
        } else {
          setGroups([]);
          setDashboard(null);
          setTeams([]);
        }
      }
    } catch (e) {
      if (request !== loadRequest.current) return;
      if (token) {
        setG(null);
        setError(err(e));
      } else if (err(e).includes('UNAUTHORIZED')) {
        setAdmin(false);
        setGroups([]);
      } else setError(err(e));
    } finally {
      if (request === loadRequest.current) setLoading(false);
    }
  };
  useEffect(() => {
    setG(null);
    setActivityEvents([]);
    setIdentity('');
    setModal(null);
    setLoading(true);
    if (!preview) void load();
    else setLoading(false);
    return () => {
      loadRequest.current += 1;
    };
  }, [token, preview]);
  useEffect(() => {
    const focus = () => {
      if (!preview && !document.hidden && !busy && !modal && !teamModal) void load();
    };
    window.addEventListener('focus', focus);
    return () => window.removeEventListener('focus', focus);
  }, [busy, modal, teamModal, token, preview]);
  const choose = (id: string) => {
    if (g) {
      localStorage.setItem(`tingting:identity:${g.id}`, id);
      setIdentity(id);
    }
  };
  const mutate = async (action: string, input?: unknown) => {
    if (!g || busy || !canEdit) return;
    setBusy(true);
    setError('');
    try {
      const x = await api.mutate(action, g.token, g.version, input);
      setG(x);
      setActivityEvents(await api.activity(x.token).catch(() => []));
      setModal(null);
      notify(translate("Đã lưu thay đổi"));
      if (x.token !== g.token) {
        if (identity) localStorage.setItem(`tingting:identity:${x.id}`, identity);
        navigate('/g/' + x.token);
      }
    } catch (e) {
      setError(err(e));
      if (err(e).includes('CONFLICT')) {
        try {
          setG(await api.group(g.token));
        } catch {}
      }
    } finally {
      setBusy(false);
    }
  };
  const copy = async (t: string) => {
    try {
      await navigator.clipboard.writeText(location.origin + '/g/' + t);
      notify(translate("Đã sao chép liên kết"));
    } catch {
      notify(translate("Không thể sao chép. Hãy sao chép URL trên trình duyệt."));
    }
  };
  const allDebts: Debt[] = g ? (simplified ? g.simplifiedDebts : g.directDebts) : [],
    out = allDebts.filter((d) => d.fromId === identity),
    incoming = allDebts.filter((d) => d.toId === identity);
  const pay = (d: Debt) => {
    if (!canEdit) return;
    setSettlement({ fromId: d.fromId, toId: d.toId, amount: d.amount });
    setModal('settlement');
  };
  const login = () => {
    const returnTo = token ? '/g/' + token : ['/teams', '/admin/access'].includes(path) ? path : '/';
    location.assign('/auth/google/start?return_to=' + encodeURIComponent(returnTo));
  };
  const logout = async () => {
    try {
      await api.logout();
      setViewer(null);
      setDashboard(null);
      setAdmin(false);
      setGroups([]);
      setTeams([]);
      setTeamModal(false);
      setModal(null);
      await load();
    } catch (error) {
      setError(err(error));
    }
  };
  const createGroup = async (input: unknown) => {
    if (busy || !viewer?.canCreateGroups) return;
    setBusy(true);
    setError('');
    try {
      const created = await api.create(input);
      setGroups((previous) => [created, ...previous]);
      setModal(null);
      await load();
      notify(translate("Đã tạo sổ chi tiêu. Bạn có thể sao chép liên kết."));
    } catch (error) {
      setError(err(error));
    } finally {
      setBusy(false);
    }
  };
  const openTeamEditor = (team?: Team) => {
    setTeamToEdit(team);
    setTeamEditorError('');
    setTeamModal(true);
  };
  const closeTeamEditor = () => {
    setTeamModal(false);
    setTeamToEdit(undefined);
    setTeamEditorError('');
  };
  const saveTeam = async (name: string, members: unknown[]) => {
    if (!viewer || busy) return;
    setBusy(true);
    setTeamEditorError('');
    try {
      const saved = teamToEdit
        ? await api.updateTeam(teamToEdit.id, teamToEdit.version, name, members)
        : await api.createTeam(name, members);
      setTeams((current) => [saved, ...current.filter((team) => team.id !== saved.id)]);
      closeTeamEditor();
      notify(teamToEdit ? translate("Đã cập nhật hội nhóm") : translate("Đã tạo hội nhóm"));
    } catch (error) {
      setTeamEditorError(err(error));
    } finally {
      setBusy(false);
    }
  };
  const deleteTeam = async () => {
    if (!viewer || !teamToEdit || busy) return;
    setBusy(true);
    setTeamEditorError('');
    try {
      await api.deleteTeam(teamToEdit.id, teamToEdit.version);
      setTeams((current) => current.filter((team) => team.id !== teamToEdit.id));
      closeTeamEditor();
      notify(translate("Đã xóa hội nhóm"));
    } catch (error) {
      setTeamEditorError(err(error));
    } finally {
      setBusy(false);
    }
  };
  return {
    path,
    viewer,
    canCreate: !!viewer?.canCreateGroups,
    navigate,
    googleEnabled,
    dashboard,
    canEdit,
    login,
    logout,
    createGroup,
    token,
    preview,
    g,
    setG,
    activityEvents,
    groups,
    setGroups,
    teams,
    teamsError,
    teamToEdit,
    openTeamEditor,
    teamModal,
    closeTeamEditor,
    teamEditorError,
    saveTeam,
    deleteTeam,
    admin,
    setAdmin,
    loading,
    error,
    setError,
    toast,
    identity,
    tab,
    setTab,
    simplified,
    setSimplified,
    modal,
    setModal,
    expense,
    setExpense,
    settlement,
    setSettlement,
    busy,
    setBusy,
    search,
    setSearch,
    notify,
    load,
    choose,
    mutate,
    copy,
    allDebts,
    out,
    incoming,
    pay,
  };
}

export type TingtingModel = ReturnType<typeof useTingting>;
