import { useEffect, useRef } from 'react';
export function useHeaderMenu() {
  const menuRef = useRef<HTMLDetailsElement>(null);
  const close = () => {
    if (menuRef.current) menuRef.current.open = false;
  };
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) close();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && menuRef.current?.open) {
        close();
        menuRef.current.querySelector('summary')?.focus();
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, []);
  return { menuRef, close };
}
