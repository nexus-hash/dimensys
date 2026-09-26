import { readFile, stat } from 'fs/promises';
import * as path from 'path';
import { NextResponse, type NextRequest } from 'next/server';
import { ENGINE_DATA_DIR } from '@/app/(server)/engine/publicData';

/**
 * Dev-only static file server for the synced engine output under
 * `data/engine/**` (the `.sim.bin` payload, `catalog.json`, view files and
 * the runtime worker bundle). These live outside `public/` (SYNC2's manifest
 * 3.1 sync), so nothing under `data/engine/` is otherwise reachable by the
 * browser — a real production route (T3.13) will read the same directory
 * through `app/(server)/engine/publicData.ts`. This one exists only so
 * `/dev/worker` has something to fetch from; it 404s in production, same
 * gating as `/dev/ui` and `/dev/player`.
 */

const CONTENT_TYPES: Record<string, string> = {
  '.json': 'application/json; charset=utf-8',
  '.bin': 'application/octet-stream',
  '.js': 'text/javascript; charset=utf-8',
};

function contentTypeFor(filePath: string): string {
  return CONTENT_TYPES[path.extname(filePath)] ?? 'application/octet-stream';
}

export async function GET(_request: NextRequest, ctx: { params: Promise<{ slug: string[] }> }): Promise<NextResponse> {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  const { slug } = await ctx.params;
  if (!slug || slug.length === 0 || slug.some((s) => s === '..' || s === '.' || s.includes('/') || s.includes('\\'))) {
    return NextResponse.json({ error: 'bad path' }, { status: 400 });
  }

  const root = path.join(process.cwd(), ENGINE_DATA_DIR);
  const absPath = path.join(root, ...slug);
  const rel = path.relative(root, absPath);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    return NextResponse.json({ error: 'bad path' }, { status: 400 });
  }

  try {
    const st = await stat(absPath);
    if (!st.isFile()) return NextResponse.json({ error: 'not found' }, { status: 404 });
    const bytes = await readFile(absPath);
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        'content-type': contentTypeFor(absPath),
        'content-length': String(st.size),
        'cache-control': 'no-store',
      },
    });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return NextResponse.json({ error: 'not found' }, { status: 404 });
    throw err;
  }
}
