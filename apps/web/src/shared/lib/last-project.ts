const LAST_PROJECT_KEY = 'nudo:last-project';

// Losing the key only means `/` falls back to the newest project, so storage
// failures (private mode, blocked site data) are safe to ignore.
export function readLastProject(): string | null {
  try {
    return localStorage.getItem(LAST_PROJECT_KEY);
  } catch {
    return null;
  }
}

export function writeLastProject(projectId: string): void {
  try {
    localStorage.setItem(LAST_PROJECT_KEY, projectId);
  } catch {
    // See readLastProject.
  }
}
