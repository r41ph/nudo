import { useParams } from 'react-router-dom';

// The URL is the only source of the active project, so nothing can disagree
// with it.
export function useProjectId(): string | undefined {
  return useParams<{ projectId: string }>().projectId;
}
