import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { searchKey } from '../utils/inputs.mjs';
export type SelectOption = { id: string; label: string };
export function useSearchSelect(
  options: SelectOption[],
  value: string,
  onChange: (value: string) => void,
) {
  const [open, setOpen] = useState(false),
    [query, setQuery] = useState(''),
    [active, setActive] = useState(0),
    [position, setPosition] = useState({
      left: 0,
      top: 0,
      width: 0,
      maxHeight: 240,
      transform: 'none',
    });
  const root = useRef<HTMLDivElement>(null),
    input = useRef<HTMLInputElement>(null),
    popup = useRef<HTMLDivElement>(null);
  const restoringFocus = useRef(false);
  const listId = useId();
  const filtered = options.filter((option) => searchKey(option.label).includes(searchKey(query)));
  const selected = options.find((option) => option.id === value);
  const close = () => {
    setOpen(false);
    setQuery('');
  };
  const show = () => {
    if (restoringFocus.current) return;
    setQuery('');
    setActive(0);
    setOpen(true);
  };
  const choose = (id: string) => {
    onChange(id);
    close();
    restoringFocus.current = true;
    input.current?.focus({ preventScroll: true });
    restoringFocus.current = false;
  };
  useLayoutEffect(() => {
    if (!open || !input.current || !popup.current) return;
    const panel = popup.current;
    const place = () => {
      const rect = input.current!.getBoundingClientRect();
      const below = window.innerHeight - rect.bottom - 12;
      const above = rect.top - 12;
      const upward = below < 180 && above > below;
      const height = Math.min(256, upward ? above : below);
      setPosition({
        left: Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8)),
        top: upward ? rect.top - 6 : rect.bottom + 6,
        width: rect.width,
        maxHeight: Math.max(80, height),
        transform: upward ? 'translateY(-100%)' : 'none',
      });
    };
    place();
    if (typeof panel.showPopover === 'function') panel.showPopover();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    const outside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!root.current?.contains(target) && !panel.contains(target)) close();
    };
    document.addEventListener('pointerdown', outside);
    return () => {
      if (panel.matches(':popover-open')) panel.hidePopover();
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
      document.removeEventListener('pointerdown', outside);
    };
  }, [open]);
  useEffect(() => {
    if (open)
      popup.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);
  const keyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        show();
        return;
      }
      setActive((index) =>
        Math.max(0, Math.min(filtered.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1))),
      );
    } else if (event.key === 'Enter' && open) {
      event.preventDefault();
      if (filtered[active]) choose(filtered[active].id);
    } else if (event.key === 'Escape' && open) {
      event.preventDefault();
      event.stopPropagation();
      close();
    } else if (event.key === 'Tab') close();
  };
  return {
    open,
    query,
    setQuery,
    active,
    setActive,
    position,
    root,
    input,
    popup,
    listId,
    filtered,
    selected,
    show,
    close,
    choose,
    keyDown,
  };
}
