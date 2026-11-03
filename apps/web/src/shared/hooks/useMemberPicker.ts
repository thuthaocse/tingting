import { useEffect, useState, useSyncExternalStore } from 'react';

const mobileQuery = '(max-width: 640px)';

export function useIsMobileViewport() {
  return useSyncExternalStore(subscribeToMobile, isMobileViewport, () => false);
}

export function useMemberPicker() {
  const [isOpen, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const [viewport, setViewport] = useState<{ bottom: number; maxHeight: number }>();

  useEffect(() => {
    const visualViewport = window.visualViewport;
    if (!isOpen || !visualViewport) return;
    const update = () => {
      setViewport({
        bottom: Math.max(0, window.innerHeight - visualViewport.offsetTop - visualViewport.height),
        maxHeight: visualViewport.height * 0.9,
      });
    };
    update();
    visualViewport.addEventListener('resize', update);
    visualViewport.addEventListener('scroll', update);
    return () => {
      visualViewport.removeEventListener('resize', update);
      visualViewport.removeEventListener('scroll', update);
    };
  }, [isOpen]);

  return { isOpen, search, setSearch, open, close, viewport };

  function open() {
    setSearch('');
    setOpen(true);
  }

  function close() {
    setOpen(false);
  }
}

function isMobileViewport() {
  return window.matchMedia(mobileQuery).matches;
}

function subscribeToMobile(onChange: () => void) {
  const media = window.matchMedia(mobileQuery);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}
