/**
 * Detects launchpad content shape (with or without the document API wrapper).
 * Launchpads have a distinctive `containerList.containers[]` layout structure.
 */
export function looksLikeLaunchpad(data: Record<string, unknown>): boolean {
  const cl = data.containerList as { containers?: unknown } | undefined;
  return !!cl && Array.isArray(cl.containers);
}

/**
 * Strip the file extension from a filename.
 */
export function nameFromFile(filename: string): string {
  return filename.replace(/\.[^.]+$/, "");
}
