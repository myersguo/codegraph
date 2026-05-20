import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { CodeGraph } from '../src';

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'codegraph-global-test-'));
}

function writeFile(root: string, relativePath: string, content: string): void {
  const fullPath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf-8');
}

describe('global source roots', () => {
  let root: string | null = null;

  afterEach(() => {
    if (root && fs.existsSync(root)) {
      fs.rmSync(root, { recursive: true, force: true });
    }
    root = null;
  });

  it('indexes multiple source roots into one DB without path collisions', async () => {
    root = tmpDir();
    const storage = path.join(root, 'storage');
    const repoA = path.join(root, 'repo-a');
    const repoB = path.join(root, 'repo-b');

    fs.mkdirSync(storage, { recursive: true });
    writeFile(repoA, 'src/index.ts', 'export function fromRepoA() { return "a"; }\n');
    writeFile(repoB, 'src/index.ts', 'export function fromRepoB() { return "b"; }\n');

    const cg = await CodeGraph.init(storage);
    await cg.indexSourceRoot(repoA);
    await cg.indexSourceRoot(repoB);

    const sourceRoots = cg.getSourceRoots();
    expect(sourceRoots).toHaveLength(2);

    const files = cg.getFiles().map((file) => file.path).sort();
    expect(files).toHaveLength(2);
    expect(files[0]).not.toBe(files[1]);
    expect(files.every((file) => file.endsWith('/src/index.ts'))).toBe(true);

    const results = cg.searchNodes('fromRepo', { limit: 10 });
    expect(results.map((result) => result.node.name).sort()).toEqual(['fromRepoA', 'fromRepoB']);
    expect(new Set(results.map((result) => result.node.filePath)).size).toBe(2);

    cg.close();
  });
});

