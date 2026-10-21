export function sortFramePaths(paths: string[]): string[] {
  return [...paths].sort((a,b) => a.localeCompare(b, 'en', { numeric: true }));
}
export function frameAt(elapsedMs: number, fps: number, count: number): number {
  if (!Number.isFinite(fps) || fps <= 0 || count <= 0 || elapsedMs < 0) return 0;
  return Math.floor(elapsedMs * fps / 1000) % count;
}
