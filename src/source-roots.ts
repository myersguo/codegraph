import * as crypto from 'crypto';
import * as path from 'path';
import { SourceRoot } from './types';

/**
 * Create a filesystem-safe, stable source-root id. The basename keeps
 * paths readable in query output; the hash prevents collisions between
 * same-named repositories.
 */
export function createSourceRootId(sourcePath: string): string {
  const resolved = path.resolve(sourcePath);
  const base = path.basename(resolved) || 'root';
  const slug = base
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'root';
  const hash = crypto.createHash('sha1').update(resolved).digest('hex').slice(0, 8);
  return `${slug}-${hash}`;
}

export function createSourceRoot(sourcePath: string, id?: string): SourceRoot {
  const resolved = path.resolve(sourcePath);
  const rootId = id ?? createSourceRootId(resolved);
  return {
    id: rootId,
    path: resolved,
    name: path.basename(resolved) || rootId,
    pathPrefix: `${rootId}/`,
    indexedAt: Date.now(),
  };
}

export function namespacePath(prefix: string, relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
  return prefix ? `${prefix}${normalized}` : normalized;
}

export function stripPathPrefix(prefix: string, filePath: string): string | null {
  if (!prefix) return filePath;
  return filePath.startsWith(prefix) ? filePath.slice(prefix.length) : null;
}

