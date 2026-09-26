import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as crypto from 'crypto';
import { spawnSync } from 'child_process';

const SCRIPT_PATH = path.resolve(__dirname, '../sync-engine-v3.js');
const RUNTIME_FORMAT = 1;

function sha256Hex(buf: Buffer): string {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function writeBytes(absPath: string, bytes: Buffer): { path: string; hash: string; bytes: number } {
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, bytes);
  return { path: '', hash: `sha256:${sha256Hex(bytes)}`, bytes: bytes.length };
}

// --- fixture: a small dist-v3 tree with manifest 3.1's flat `files[]` ------

interface Fixture {
  engineDir: string;
  appDir: string;
}

function makeTempDirs(): Fixture {
  const engineDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-engine-dist-v3-'));
  const appDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dimensys-app-'));
  return { engineDir, appDir };
}

/** Writes one file under `engineDir` at `relPath` and returns its manifest `files[]` entry. */
function writeManifestFile(
  engineDir: string,
  relPath: string,
  bytes: Buffer,
  scope: 'public' | 'server',
): { path: string; hash: string; bytes: number; scope: 'public' | 'server' } {
  const entry = writeBytes(path.join(engineDir, relPath), bytes);
  return { ...entry, path: relPath, scope };
}

function jsonBytes(value: unknown): Buffer {
  return Buffer.from(`${JSON.stringify(value)}\n`, 'utf-8');
}

function buildManifestFixture(engineDir: string) {
  const files = [
    writeManifestFile(engineDir, 'public/diagrams/foo.view.json', jsonBytes({ id: 'foo', fmt: RUNTIME_FORMAT }), 'public'),
    writeManifestFile(engineDir, 'public/diagrams/foo.sim.bin', Buffer.from([0xd5, 0x1a, 1, 0, 1, 2, 3, 4, 5, 6, 7]), 'public'),
    writeManifestFile(engineDir, 'public/catalog.json', jsonBytes({ fmt: RUNTIME_FORMAT, cards: [] }), 'public'),
    writeManifestFile(engineDir, 'public/paths/bar.view.json', jsonBytes({ id: 'bar', fmt: RUNTIME_FORMAT }), 'public'),
    writeManifestFile(engineDir, 'server/diagrams/foo.json', jsonBytes({ source: { interview: 'do-not-ship' } }), 'server'),
    writeManifestFile(engineDir, 'server/diagrams/foo.compiled.json', jsonBytes({ compiled: true }), 'server'),
    writeManifestFile(engineDir, 'server/puzzles/qux.json', jsonBytes({ secret: 42 }), 'server'),
  ];

  const manifest = {
    version: '3.1.0',
    runtimeFormat: RUNTIME_FORMAT,
    engineVersion: '3.0.0',
    generatedAt: '2026-01-01T00:00:00.000Z',
    catalog: files[2],
    diagrams: [{ id: 'foo', route: 'solutions/foo', build: 'sha256:' + '1'.repeat(64), view: files[0], sim: files[1], server: [files[4], files[5]] }],
    paths: [{ id: 'bar', view: files[3], server: [] }],
    libraries: [],
    puzzles: [{ id: 'qux', publishOn: '2026-01-01', server: [files[6]] }],
    files,
    staticAssets: [],
    sharedComponents: [],
    peerDependencies: { react: '^19.0.0', 'react-dom': '^19.0.0' },
  };
  fs.writeFileSync(path.join(engineDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
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
    expect(result.status, result.stderr).toBe(0);

    const dataEngine = path.join(fixture.appDir, 'data', 'engine');
    const serverDataEngine = path.join(fixture.appDir, 'server-data', 'engine');

    expect(fs.existsSync(path.join(dataEngine, 'diagrams', 'foo.view.json'))).toBe(true);
    expect(fs.existsSync(path.join(dataEngine, 'diagrams', 'foo.sim.bin'))).toBe(true);
    expect(fs.existsSync(path.join(dataEngine, 'paths', 'bar.view.json'))).toBe(true);
    expect(fs.existsSync(path.join(dataEngine, 'catalog.json'))).toBe(true);
    expect(fs.existsSync(path.join(dataEngine, 'manifest.json'))).toBe(true);

    expect(fs.existsSync(path.join(serverDataEngine, 'diagrams', 'foo.json'))).toBe(true);
    expect(fs.existsSync(path.join(serverDataEngine, 'diagrams', 'foo.compiled.json'))).toBe(true);
    expect(fs.existsSync(path.join(serverDataEngine, 'puzzles', 'qux.json'))).toBe(true);

    // No "public" or "server" sub-prefix survives the copy.
    expect(fs.existsSync(path.join(dataEngine, 'public'))).toBe(false);
    expect(fs.existsSync(path.join(serverDataEngine, 'server'))).toBe(false);

    // The binary payload is copied byte-for-byte.
    const srcBin = fs.readFileSync(path.join(fixture.engineDir, 'public', 'diagrams', 'foo.sim.bin'));
    const destBin = fs.readFileSync(path.join(dataEngine, 'diagrams', 'foo.sim.bin'));
    expect(destBin.equals(srcBin)).toBe(true);

    const copiedServer = JSON.parse(fs.readFileSync(path.join(serverDataEngine, 'diagrams', 'foo.json'), 'utf-8'));
    expect(copiedServer.source.interview).toBe('do-not-ship');
  });

  it('never puts server data under public/ or data/engine/', () => {
    const fixture = track(makeTempDirs());
    buildManifestFixture(fixture.engineDir);
    // Simulate a pre-existing Next.js public/ directory with unrelated content.
    fs.mkdirSync(path.join(fixture.appDir, 'public'), { recursive: true });
    fs.writeFileSync(path.join(fixture.appDir, 'public', 'favicon.json'), JSON.stringify({ ok: true }));

    const result = runSync(fixture);
    expect(result.status, result.stderr).toBe(0);

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
    }

    const dataEngineFiles = walk(path.join(fixture.appDir, 'data', 'engine'));
    for (const file of dataEngineFiles) {
      if (file.endsWith('.bin')) continue;
      const content = fs.readFileSync(file, 'utf-8');
      expect(content).not.toContain('do-not-ship');
      expect(content).not.toContain('secret');
    }
  });

  it('is idempotent: a second run makes no writes and leaves mtimes unchanged', () => {
    const fixture = track(makeTempDirs());
    buildManifestFixture(fixture.engineDir);

    expect(runSync(fixture).status).toBe(0);

    const dataEngine = path.join(fixture.appDir, 'data', 'engine');
    const serverDataEngine = path.join(fixture.appDir, 'server-data', 'engine');
    const files = [
      path.join(dataEngine, 'diagrams', 'foo.view.json'),
      path.join(dataEngine, 'diagrams', 'foo.sim.bin'),
      path.join(dataEngine, 'paths', 'bar.view.json'),
      path.join(dataEngine, 'catalog.json'),
      path.join(dataEngine, 'manifest.json'),
      path.join(serverDataEngine, 'diagrams', 'foo.json'),
      path.join(serverDataEngine, 'puzzles', 'qux.json'),
    ];
    const mtimesBefore = files.map((f) => fs.statSync(f).mtimeMs);

    const second = runSync(fixture);
    expect(second.status, second.stderr).toBe(0);
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
    expect(fs.existsSync(path.join(dataEngine, 'paths', 'bar.view.json'))).toBe(true);
    expect(fs.existsSync(path.join(serverDataEngine, 'puzzles', 'qux.json'))).toBe(true);

    // Rewrite the manifest without the path and the puzzle's file entries.
    const trimmedFiles = manifest.files.filter((f: { path: string }) => f.path !== 'public/paths/bar.view.json' && f.path !== 'server/puzzles/qux.json');
    const trimmed = { ...manifest, paths: [], puzzles: [], files: trimmedFiles };
    fs.writeFileSync(path.join(fixture.engineDir, 'manifest.json'), JSON.stringify(trimmed, null, 2));

    const result = runSync(fixture);
    expect(result.status, result.stderr).toBe(0);

    expect(fs.existsSync(path.join(dataEngine, 'paths', 'bar.view.json'))).toBe(false);
    expect(fs.existsSync(path.join(dataEngine, 'paths'))).toBe(false); // empty dir pruned
    expect(fs.existsSync(path.join(serverDataEngine, 'puzzles', 'qux.json'))).toBe(false);

    // Untouched entries survive.
    expect(fs.existsSync(path.join(dataEngine, 'diagrams', 'foo.view.json'))).toBe(true);
  });

  it('fails loudly and writes nothing when a file has been tampered with (hash mismatch)', () => {
    const fixture = track(makeTempDirs());
    buildManifestFixture(fixture.engineDir);

    const serverPath = path.join(fixture.engineDir, 'server', 'diagrams', 'foo.json');
    const original = fs.readFileSync(serverPath, 'utf-8');
    // Same length as the original so this exercises the hash check, not the size check.
    fs.writeFileSync(serverPath, original.replace('do-not-ship', 'TAMPERED!!!'));

    const result = runSync(fixture);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('hash mismatch');
    expect(fs.existsSync(path.join(fixture.appDir, 'data', 'engine'))).toBe(false);
    expect(fs.existsSync(path.join(fixture.appDir, 'server-data', 'engine'))).toBe(false);
  });

  it('fails loudly on a size mismatch', () => {
    const fixture = track(makeTempDirs());
    const manifest = buildManifestFixture(fixture.engineDir);
    manifest.files[0].bytes = manifest.files[0].bytes + 5;
    fs.writeFileSync(path.join(fixture.engineDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

    const result = runSync(fixture);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('size mismatch');
  });

  it('fails loudly on a scope mismatch (declared scope disagrees with the path prefix)', () => {
    const fixture = track(makeTempDirs());
    const manifest = buildManifestFixture(fixture.engineDir);
    // "public"-scoped entry whose own path is actually under server/.
    manifest.files[0].scope = 'server';
    fs.writeFileSync(path.join(fixture.engineDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

    const result = runSync(fixture);
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/expected to start with "server\/"/);
  });

  it('fails loudly on an unknown runtimeFormat', () => {
    const fixture = track(makeTempDirs());
    const manifest = buildManifestFixture(fixture.engineDir);
    const bumped = { ...manifest, runtimeFormat: 2 };
    fs.writeFileSync(path.join(fixture.engineDir, 'manifest.json'), JSON.stringify(bumped, null, 2));

    const result = runSync(fixture);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('runtimeFormat');
    expect(fs.existsSync(path.join(fixture.appDir, 'data', 'engine'))).toBe(false);
  });

  it('fails loudly when a listed manifest file is missing', () => {
    const fixture = track(makeTempDirs());
    buildManifestFixture(fixture.engineDir);
    fs.rmSync(path.join(fixture.engineDir, 'public', 'paths', 'bar.view.json'));

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
