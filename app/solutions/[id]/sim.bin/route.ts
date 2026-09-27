import { readFile, stat } from 'fs/promises';
import * as path from 'path';
import { NextResponse } from 'next/server';
import { ENGINE_DATA_DIR, listDiagramIds, loadSimPayloadRef } from '@/app/(server)/engine/publicData';

/**
 * Production delivery (T3.13) of a diagram's opaque `.sim.bin` payload —
 * synced by `sync-engine-v3.js` into `data/engine/diagrams/<id>.sim.bin`,
 * outside `public/` (T2.5's server/public split), so nothing serves it
 * without going through `loadSimPayloadRef`'s manifest lookup first. Only
 * diagrams that simulate (`manifest.diagrams[].sim` present) get a static
 * file here; the rest simply aren't in `generateStaticParams`, so the id
 * still 404s (`dynamicParams = false`) with no runtime `fs` access.
 *
 * The bytes are never parsed — copied straight through, same as the sync
 * script's own "raw bytes only" rule. Immutable, hashed via the same
 * `?h=<hash8>` convention `loadRuntimeUrl` uses for the worker bundle.
 */
export const dynamic = 'force-static';
export const dynamicParams = false;

export async function generateStaticParams(): Promise<Array<{ id: string }>> {
  const ids = await listDiagramIds();
  const withSim: string[] = [];
  for (const id of ids) {
    if (await loadSimPayloadRef(id)) withSim.push(id);
  }
  return withSim.map((id) => ({ id }));
}

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await ctx.params;
  const ref = await loadSimPayloadRef(id);
  if (!ref) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  const absPath = path.join(process.cwd(), ENGINE_DATA_DIR, ...ref.dataPath.split('/'));
  try {
    const st = await stat(absPath);
    if (!st.isFile()) return NextResponse.json({ error: 'not found' }, { status: 404 });
    const bytes = await readFile(absPath);
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        'content-type': 'application/octet-stream',
        'content-length': String(st.size),
        'cache-control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }
    throw err;
  }
}
