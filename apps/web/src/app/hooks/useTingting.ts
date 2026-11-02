import { useEffect, useRef, useState } from 'react';
import { useNavigation } from './useNavigation';
import { api, type Viewer, type Dashboard } from '../../api';
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
  const notify = (t: string) => {
    setToast(t);
    window.setTimeout(() => setToast(''), 3500);
  };
  const load = async () => {
    const request = ++loadRequest.current;
    setError(
      new URLSearchParams(location.search).has('auth_error')
        ? 'Chưa thể đăng nhập Google. Vui lòng thử lại.'
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
        const saved =
          localStorage.getItem(`tingting:identity:${x.id}`) ||
          localStorage.getItem(`lilac:identity:${x.id}`) ||
          '';
        setIdentity(viewingIdentity(x, !!session.me, saved));
      } else {
        if (session.me) {
          const [list, summary] = await Promise.all([api.groups(), api.dashboard()]);
          if (request !== loadRequest.current) return;
          setGroups(list);
          setDashboard(summary);
        } else {
          setGroups([]);
          setDashboard(null);
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
      if (!preview && !document.hidden && !busy && !modal) void load();
    };
    window.addEventListener('focus', focus);
    return () => window.removeEventListener('focus', focus);
  }, [busy, modal, token, preview]);
  const choose = (id: string) => {
    if (g) {
      localStorage.setItem(`tingting:identity:${g.id}`, id);
      setIdentity(id);
    }
  };
  const mutate = async (action: string, input?: unknown) => {
    if (!g || busy || !viewer) return;
    setBusy(true);
    setError('');
    try {
      const x = await api.mutate(action, g.token, g.version, input);
      setG(x);
      setModal(null);
      notify('Đã lưu thay đổi');
      if (x.token !== g.token) navigate('/g/' + x.token);
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
      notify('Đã sao chép liên kết');
    } catch {
      notify('Không thể sao chép. Hãy sao chép URL trên trình duyệt.');
    }
  };
  const allDebts: Debt[] = g ? (simplified ? g.simplifiedDebts : g.directDebts) : [],
    out = allDebts.filter((d) => d.fromId === identity),
    incoming = allDebts.filter((d) => d.toId === identity);
  const pay = (d: Debt) => {
    if (!viewer || g?.archived) return;
    setSettlement({ fromId: d.fromId, toId: d.toId, amount: d.amount });
    setModal('settlement');
  };
  const login = () => {
    location.assign(
      '/auth/google/start?return_to=' + encodeURIComponent(token ? '/g/' + token : '/'),
    );
  };
  const logout = async () => {
    try {
      await api.logout();
      setViewer(null);
      setDashboard(null);
      setAdmin(false);
      setGroups([]);
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
      notify('Đã tạo nhóm. Bạn có thể sao chép liên kết.');
    } catch (error) {
      setError(err(error));
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
    canEdit: !!viewer && !g?.archived,
    login,
    logout,
    createGroup,
    token,
    preview,
    g,
    setG,
    groups,
    setGroups,
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
