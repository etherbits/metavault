const NAVIGATE_EVENT = "metavault:navigate";

export function navigateTo(pathname: string) {
  if (window.location.pathname === pathname) {
    window.dispatchEvent(new Event(NAVIGATE_EVENT));
    return;
  }

  window.history.pushState({}, "", pathname);
  window.dispatchEvent(new Event(NAVIGATE_EVENT));
}

export function addNavigationListener(listener: () => void): () => void {
  window.addEventListener("popstate", listener);
  window.addEventListener(NAVIGATE_EVENT, listener);

  return () => {
    window.removeEventListener("popstate", listener);
    window.removeEventListener(NAVIGATE_EVENT, listener);
  };
}
