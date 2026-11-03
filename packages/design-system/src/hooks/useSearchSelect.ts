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
    const anchor = input.current;
    const panel = popup.current;
    if (!open || !anchor || !panel) return;
    const viewport = window.visualViewport;
    const place = () => setPosition(popupPosition(anchor.getBoundingClientRect(), viewport));
    place();
    if (typeof panel.showPopover === 'function') panel.showPopover();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    viewport?.addEventListener('resize', place);
    viewport?.addEventListener('scroll', place);
    const outside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!root.current?.contains(target) && !panel.contains(target)) close();
    };
    document.addEventListener('pointerdown', outside);
    return () => {
      if (panel.matches(':popover-open')) panel.hidePopover();
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
      viewport?.removeEventListener('resize', place);
      viewport?.removeEventListener('scroll', place);
      document.removeEventListener('pointerdown', outside);
    };
  }, [open]);
  useEffect(() => {
    if (open && popup.current) revealActiveOption(popup.current);
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

function popupPosition(anchor: DOMRect, viewport: VisualViewport | null) {
  const inset = 8;
  const gap = 6;
  const left = (viewport?.offsetLeft ?? 0) + inset;
  const top = (viewport?.offsetTop ?? 0) + inset;
  const right = left + (viewport?.width ?? window.innerWidth) - 2 * inset;
  const bottom = top + (viewport?.height ?? window.innerHeight) - 2 * inset;
  const above = Math.min(anchor.top - gap, bottom) - top;
  const below = bottom - Math.max(anchor.bottom + gap, top);
  const upward = below < 180 && above > below;
  const width = Math.min(anchor.width, Math.max(0, right - left));
  return {
    left: Math.max(left, Math.min(anchor.left, right - width)),
    top: upward ? Math.min(anchor.top - gap, bottom) : Math.max(anchor.bottom + gap, top),
    width,
    maxHeight: Math.max(0, Math.min(256, upward ? above : below)),
    transform: upward ? 'translateY(-100%)' : 'none',
  };
}

function revealActiveOption(panel: HTMLElement) {
  const option = panel.querySelector('[data-active="true"]');
  if (!option) return;
  const bounds = panel.getBoundingClientRect();
  const optionBounds = option.getBoundingClientRect();
  const scrollTop = optionBounds.top - bounds.top - panel.clientTop;
  const scrollBottom = scrollTop + optionBounds.height - panel.clientHeight;
  panel.scrollTop += Math.min(0, scrollTop) + Math.max(0, scrollBottom);
}
