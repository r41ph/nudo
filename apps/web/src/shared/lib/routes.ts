export function projectPath(projectId: string): string {
  return `/project/${projectId}`;
}

export function documentPath(projectId: string, documentId: string): string {
  return `/project/${projectId}/document/${documentId}`;
}

export function plotPath(projectId: string): string {
  return `/project/${projectId}/plot`;
}
