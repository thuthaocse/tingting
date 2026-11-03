export function internalRoute(href, base, event, target = '', download = false) {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    target ||
    download
  )
    return null;
  const url = new URL(href, base);
  if (url.origin !== new URL(base).origin) return null;
  if (
    url.pathname !== '/' &&
    url.pathname !== '/design-system' &&
    url.pathname !== '/admin/access' &&
    url.pathname !== '/teams' &&
    !/^\/g\/[A-Za-z0-9_-]+$/.test(url.pathname)
  )
    return null;
  return url.pathname + url.search + url.hash;
}
