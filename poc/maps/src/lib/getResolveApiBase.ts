/** VITE_RESOLVE_API_BASE without trailing slash, or undefined when unset. */
export function getResolveApiBase(): string | undefined {
  return import.meta.env.VITE_RESOLVE_API_BASE?.replace(/\/$/, '');
}
