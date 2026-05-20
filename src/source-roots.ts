import * as crypto from 'crypto';
import * as path from 'path';
import { execFileSync } from 'child_process';
import { SourceRoot } from './types';

/**
 * Normalize a git remote URL to a canonical form, removing protocol
 * and .git suffix differences so SSH and HTTPS variants produce the
 * same identity.
 */
function normalizeGitUrl(url: string): string {
  let normalized = url.trim().replace(/\.git$/, '').replace(/\/$/, '');
  // SSH: git@host:path → host/path
  const ssh = normalized.match(/^git@([^:]+):(.+)$/);
  if (ssh?.[1] && ssh?.[2]) return `${ssh[1].toLowerCase()}/${ssh[2]}`;
  // HTTPS: https://host/path → host/path
  const https = normalized.match(/^https?:\/\/([^/]+)\/(.+)$/);
  if (https?.[1] && https?.[2]) return `${https[1].toLowerCase()}/${https[2]}`;
  return normalized.toLowerCase();
}

/**
 * Return the normalized git remote origin URL for a directory, or null
 * if the directory is not a git repo or has no origin remote.
 */
function getGitRemoteOrigin(dir: string): string | null {
  try {
    const url = execFileSync('git', ['-C', dir, 'remote', 'get-url', 'origin'], { encoding: 'utf-8' }).trim();
    return url ? normalizeGitUrl(url) : null;
  } catch {
    return null;
  }
}

/**
 * Create a filesystem-safe, stable source-root id. The basename keeps
 * paths readable in query output; the hash prevents collisions between
 * same-named repositories.
 *
 * When the directory is a git repo with a remote origin, the identity
 * is derived from the normalized remote URL so the same repo produces
 * the same id regardless of clone location. Falls back to the
 * filesystem path for non-git directories.
 */
export function createSourceRootId(sourcePath: string): string {
  const resolved = path.resolve(sourcePath);
  const remoteUrl = getGitRemoteOrigin(resolved);
  const identity = remoteUrl ?? resolved;
  const base = path.basename(resolved) || 'root';
  const slug = base
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'root';
  const hash = crypto.createHash('sha1').update(identity).digest('hex').slice(0, 8);
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

