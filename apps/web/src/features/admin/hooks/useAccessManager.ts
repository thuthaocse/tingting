import { useEffect, useState } from 'react';
import { api } from '../../../api';
import { err } from '../../../shared/forms';
export function useAccessManager(onChange: () => Promise<void>) {
  const [open, setOpen] = useState(true),
    [grants, setGrants] = useState<{ email: string; role: string }[]>([]),
    [email, setEmail] = useState(''),
    [role, setRole] = useState('creator'),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    api
      .grants()
      .then((rows) => {
        if (!cancelled) setGrants(rows);
      })
      .catch((e) => {
        if (!cancelled) setError(err(e));
      });
    return () => {
      cancelled = true;
    };
  }, [open]);
  const save = async (target: string, next: string | null) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await api.setGrant(target, next);
      setGrants(await api.grants());
      setEmail('');
      await onChange();
    } catch (e) {
      setError(err(e));
    } finally {
      setBusy(false);
    }
  };
  return { open, setOpen, grants, email, setEmail, role, setRole, busy, error, save };
}
