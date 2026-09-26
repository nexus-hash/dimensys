import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as crypto from 'crypto';
import { spawnSync } from 'child_process';

const SCRIPT_PATH = path.resolve(__dirname, '../sync-engine-v3.js');

// --- content hashing, mirroring how the engine hashes documents, used only
// to build fixture files with a correct `compiled.hash`. ---------------------

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value !== null && typeof value === 'object') {
    const input = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(input).sort()) out[key] = sortKeysDeep(input[key]);
    return out;
  }
  return value;
}

function contentHash(value: unknown): string {
  const canonical = JSON.stringify(sortKeysDeep(value));
  return `sha256:${crypto.createHash('sha256').update(canonical, 'utf-8').digest('hex')}`;
}

function writeJson(absPath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, JSON.stringify(value, null, 2));
}

// --- fixture: a small but complete dist-v3 tree -----------------------------

interface Fixture {
  engineDir: string;
  appDir: string;
}

function makeTempDirs(): Fixture {
  const engineDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-engine-dist-v3-'));
  const appDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dimensys-app-'));
  return { engineDir, appDir };
}

/** Writes a diagram's public + server compiled files, sharing one `compiled` stamp, as compileAll.ts does. */
function writeDiagram(engineDir: string, id: string, extra: Record<string, unknown> = {}) {
  const source = { id, kind: 'diagram', title: `Diagram ${id}`, interview: { secret: 'do-not-ship' }, ...extra };
  const compiled = { engineVersion: '3.0.0', hash: contentHash(source), builtAt: '2026-01-01T00:00:00.000Z' };
  const { interview: _interview, ...publicBody } = source;
  void _interview;

  const compiledDiagram = { ...publicBody, compiled, layouts: { desktop: { canvas: { w: 1, h: 1 }, nodes: {}, links: {} } }, walkthroughStates: {} };
  const serverDiagram = { compiled, source };

  writeJson(path.join(engineDir, 'public', 'diagrams', `${id}.json`), compiledDiagram);
  writeJson(path.join(engineDir, 'server', 'diagrams', `${id}.json`), serverDiagram);

  return {
    id,
    route: `solutions/${id}`,
    public: `public/diagrams/${id}.json`,
    server: `server/diagrams/${id}.json`,
  };
}

/** Writes a `{...doc, compiled}` file (paths/libraries/puzzles shape). */
function writeSelfHashed(engineDir: string, relDir: string, id: string, extra: Record<string, unknown> = {}) {
  const doc = { id, title: `Doc ${id}`, ...extra };
  const compiled = { engineVersion: '3.0.0', hash: contentHash(doc), builtAt: '2026-01-01T00:00:00.000Z' };
  const relPath = path.join(relDir, `${id}.json`);
  writeJson(path.join(engineDir, relPath), { ...doc, compiled });
  return relPath.split(path.sep).join('/');
}

function buildManifestFixture(engineDir: string) {
  const diagram = writeDiagram(engineDir, 'foo');
  const pathPublic = writeSelfHashed(engineDir, 'public/paths', 'bar');
  const libraryPublic = writeSelfHashed(engineDir, 'public/library', 'baz');
  const puzzleServer = writeSelfHashed(engineDir, 'server/puzzles', 'qux', { publishOn: '2026-01-01', secret: { answer: 42 } });

  writeJson(path.join(engineDir, 'catalog.json'), { version: '1', entries: [] });

  const manifest = {
    version: '3.0.0',
    generatedAt: '2026-01-01T00:00:00.000Z',
    catalog: 'catalog.json',
    diagrams: [diagram],
    paths: [{ id: 'bar', public: pathPublic }],
    libraries: [{ id: 'baz', public: libraryPublic }],
    puzzles: [{ id: 'qux', publishOn: '2026-01-01', server: puzzleServer }],
    staticAssets: [],
    sharedComponents: [],
    peerDependencies: { react: '^19.0.0', 'react-dom': '^19.0.0' },
  };
  writeJson(path.join(engineDir, 'manifest.json'), manifest);
  return manifest;
}

function runSync(fixture: Fixture) {
  return spawnSync(process.execPath, [SCRIPT_PATH], {
    encoding: 'utf-8',
    env: {
      ...process.env,
      DMS_ENGINE_DIST_V3: fixture.engineDir,
      DIMENSYS_ROOT: fixture.appDir,
    },
  });
}

const tempDirs: string[] = [];
function track(fixture: Fixture): Fixture {
  tempDirs.push(fixture.engineDir, fixture.appDir);
  return fixture;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop()!;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('sync-engine-v3.js', () => {
  it('copies public/* into data/engine/ and server/* into server-data/engine/, flattening the prefix', () => {
    const fixture = track(makeTempDirs());
    buildManifestFixture(fixture.engineDir);

    const result = runSync(fixture);
    expect(result.status).toBe(0);

    const dataEngine = path.join(fixture.appDir, 'data', 'engine');
    const serverDataEngine = path.join(fixture.appDir, 'server-data', 'engine');

    expect(fs.existsSync(path.join(dataEngine, 'diagrams', 'foo.json'))).toBe(true);
    expect(fs.existsSync(path.join(dataEngine, 'paths', 'bar.json'))).toBe(true);
    expect(fs.existsSync(path.join(dataEngine, 'library', 'baz.json'))).toBe(true);
    expect(fs.existsSync(path.join(dataEngine, 'catalog.json'))).toBe(true);
    expect(fs.existsSync(path.join(dataEngine, 'manifest.json'))).toBe(true);

    expect(fs.existsSync(path.join(serverDataEngine, 'diagrams', 'foo.json'))).toBe(true);
    expect(fs.existsSync(path.join(serverDataEngine, 'puzzles', 'qux.json'))).toBe(true);

    // Content round-trips correctly.
    const copiedPublic = JSON.parse(fs.readFileSync(path.join(dataEngine, 'diagrams', 'foo.json'), 'utf-8'));
    expect(copiedPublic.id).toBe('foo');
    const copiedServer = JSON.parse(fs.readFileSync(path.join(serverDataEngine, 'diagrams', 'foo.json'), 'utf-8'));
    expect(copiedServer.source.interview.secret).toBe('do-not-ship');

    // No "public" or "server" sub-prefix survives the copy.
    expect(fs.existsSync(path.join(dataEngine, 'public'))).toBe(false);
    expect(fs.existsSync(path.join(serverDataEngine, 'server'))).toBe(false);
  });

  it('never puts server data under public/ or data/engine/', () => {
    const fixture = track(makeTempDirs());
    buildManifestFixture(fixture.engineDir);
    // Simulate a pre-existing Next.js public/ directory with unrelated content.
    writeJson(path.join(fixture.appDir, 'public', 'favicon.json'), { ok: true });

    const result = runSync(fixture);
    expect(result.status).toBe(0);

    const walk = (dir: string): string[] => {
      if (!fs.existsSync(dir)) return [];
      return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const abs = path.join(dir, entry.name);
        return entry.isDirectory() ? walk(abs) : [abs];
      });
    };

    const publicFiles = walk(path.join(fixture.appDir, 'public'));
    for (const file of publicFiles) {
      expect(file).not.toContain('server-data');
      expect(file).not.toMatch(/diagrams[/\\]foo\.json$/);
      expect(file).not.toMatch(/puzzles[/\\]qux\.json$/);
      const content = fs.readFileSync(file, 'utf-8');
      expect(content).not.toContain('do-not-ship');
    }

    const dataEngineFiles = walk(path.join(fixture.appDir, 'data', 'engine'));
    for (const file of dataEngineFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      expect(content).not.toContain('do-not-ship');
    }
  });

  it('is idempotent: a second run makes no writes and leaves mtimes unchanged', () => {
    const fixture = track(makeTempDirs());
    buildManifestFixture(fixture.engineDir);

    expect(runSync(fixture).status).toBe(0);

    const dataEngine = path.join(fixture.appDir, 'data', 'engine');
    const serverDataEngine = path.join(fixture.appDir, 'server-data', 'engine');
    const files = [
      path.join(dataEngine, 'diagrams', 'foo.json'),
      path.join(dataEngine, 'paths', 'bar.json'),
      path.join(dataEngine, 'library', 'baz.json'),
      path.join(dataEngine, 'catalog.json'),
      path.join(dataEngine, 'manifest.json'),
      path.join(serverDataEngine, 'diagrams', 'foo.json'),
      path.join(serverDataEngine, 'puzzles', 'qux.json'),
    ];
    const mtimesBefore = files.map((f) => fs.statSync(f).mtimeMs);

    const second = runSync(fixture);
    expect(second.status).toBe(0);
    expect(second.stdout).toContain('already up to date');

    const mtimesAfter = files.map((f) => fs.statSync(f).mtimeMs);
    expect(mtimesAfter).toEqual(mtimesBefore);
  });

  it('removes files that are no longer listed in the manifest', () => {
    const fixture = track(makeTempDirs());
    const manifest = buildManifestFixture(fixture.engineDir);
    expect(runSync(fixture).status).toBe(0);

    const dataEngine = path.join(fixture.appDir, 'data', 'engine');
    const serverDataEngine = path.join(fixture.appDir, 'server-data', 'engine');
    expect(fs.existsSync(path.join(dataEngine, 'paths', 'bar.json'))).toBe(true);
    expect(fs.existsSync(path.join(serverDataEngine, 'puzzles', 'qux.json'))).toBe(true);

    // Rewrite the manifest without the path and the puzzle.
    const trimmed = { ...manifest, paths: [], puzzles: [] };
    writeJson(path.join(fixture.engineDir, 'manifest.json'), trimmed);

    const result = runSync(fixture);
    expect(result.status).toBe(0);

    expect(fs.existsSync(path.join(dataEngine, 'paths', 'bar.json'))).toBe(false);
    expect(fs.existsSync(path.join(dataEngine, 'paths'))).toBe(false); // empty dir pruned
    expect(fs.existsSync(path.join(serverDataEngine, 'puzzles', 'qux.json'))).toBe(false);

    // Untouched entries survive.
    expect(fs.existsSync(path.join(dataEngine, 'diagrams', 'foo.json'))).toBe(true);
  });

  it('fails loudly and writes nothing when a server diagram hash does not match its source', () => {
    const fixture = track(makeTempDirs());
    buildManifestFixture(fixture.engineDir);

    const serverPath = path.join(fixture.engineDir, 'server', 'diagrams', 'foo.json');
    const serverContent = JSON.parse(fs.readFileSync(serverPath, 'utf-8'));
    serverContent.source.title = 'Tampered title';
    writeJson(serverPath, serverContent);

    const result = runSync(fixture);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('hash mismatch');
    expect(fs.existsSync(path.join(fixture.appDir, 'data', 'engine'))).toBe(false);
    expect(fs.existsSync(path.join(fixture.appDir, 'server-data', 'engine'))).toBe(false);
  });

  it('fails loudly when a public diagram hash disagrees with its server counterpart', () => {
    const fixture = track(makeTempDirs());
    buildManifestFixture(fixture.engineDir);

    const publicPath = path.join(fixture.engineDir, 'public', 'diagrams', 'foo.json');
    const publicContent = JSON.parse(fs.readFileSync(publicPath, 'utf-8'));
    publicContent.compiled.hash = 'sha256:' + '0'.repeat(64);
    writeJson(publicPath, publicContent);

    const result = runSync(fixture);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('hash mismatch');
  });

  it('fails loudly when a listed manifest file is missing', () => {
    const fixture = track(makeTempDirs());
    buildManifestFixture(fixture.engineDir);
    fs.rmSync(path.join(fixture.engineDir, 'public', 'library', 'baz.json'));

    const result = runSync(fixture);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('not found');
  });

  it('exits 0 without writing anything when the engine has no v3 manifest yet', () => {
    const fixture = track(makeTempDirs());
    // engineDir exists but is empty — no manifest.json.

    const result = runSync(fixture);
    expect(result.status).toBe(0);
    expect(fs.existsSync(path.join(fixture.appDir, 'data', 'engine'))).toBe(false);
    expect(fs.existsSync(path.join(fixture.appDir, 'server-data', 'engine'))).toBe(false);
  });
});
