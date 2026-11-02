import { useEffect, useState } from 'react';
import { internalRoute } from '../utils/navigation.mjs';
export function useNavigation() {
  const [path, setPath] = useState(location.pathname);
  useEffect(() => {
    const update = () => {
      setPath(location.pathname);
      window.scrollTo(0, 0);
    };
    const follow = (event: MouseEvent) => {
      const anchor = (event.target as Element).closest('a');
      if (!anchor || anchor.target || anchor.hasAttribute('download')) return;
      const route = internalRoute(
        anchor.href,
        location.href,
        event,
        anchor.target,
        anchor.hasAttribute('download'),
      );
      if (route === null) return;
      event.preventDefault();
      navigate(route);
    };
    window.addEventListener('popstate', update);
    window.addEventListener('tingting:navigate', update);
    document.addEventListener('click', follow);
    return () => {
      window.removeEventListener('popstate', update);
      window.removeEventListener('tingting:navigate', update);
      document.removeEventListener('click', follow);
    };
  }, []);
  return { path, navigate };
}
function navigate(path: string) {
  history.pushState(null, '', path);
  window.dispatchEvent(new Event('tingting:navigate'));
}
