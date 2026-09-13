import { useLocation } from 'react-router-dom';

export function useIsEditorRoute(): boolean {
  return useLocation().pathname.startsWith('/document/');
}
