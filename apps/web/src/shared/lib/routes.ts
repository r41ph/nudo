export function projectPath(projectId: string): string {
  return `/project/${projectId}`;
}

export function documentPath(projectId: string, documentId: string): string {
  return `/project/${projectId}/document/${documentId}`;
}

export const PLOT_ROUTE = '/project/:projectId/plot';

export function plotPath(projectId: string): string {
  return `/project/${projectId}/plot`;
}
