import { useLocation } from 'react-router-dom';

/**
 * True while a document is open (`/document/:id`). The editor view owns its own
 * consolidated top bar (breadcrumb + save status + word delta + focus + theme),
 * so the global app `TopBar` is suppressed on this route — see `AppLayout`.
 */
export function useIsEditorRoute(): boolean {
  return useLocation().pathname.startsWith('/document/');
}
