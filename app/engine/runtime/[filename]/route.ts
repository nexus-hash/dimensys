import { readFile, stat } from 'fs/promises';
import * as path from 'path';
import { NextResponse } from 'next/server';
import { ENGINE_DATA_DIR, listRuntimeBundleFilenames } from '@/app/(server)/engine/publicData';

/**
 * Production delivery (T3.13) of the prebuilt sim runtime worker bundle —
 * synced by `sync-engine-v3.js` into `data/engine/runtime/`, outside
 * `public/`. This is the route `loadRuntimeUrl` (`publicData.ts`, SYNC2)
 * already builds URLs for: `/engine/runtime/<filename>?h=<hash8>`. No route
 * served that path before this task; the dev-only worker page instead read
 * the same synced bytes through its own dev-gated catch-all
 * (`app/dev/worker/data/[...slug]/route.ts`).
 *
 * The filename is validated against the manifest's own file list before
 * anything is read off disk — never trust the requested path segment alone,
 * even though `dynamicParams = false` already limits this to filenames
 * `generateStaticParams` enumerated at build time.
 */
export const dynamic = 'force-static';
export const dynamicParams = false;

export async function generateStaticParams(): Promise<Array<{ filename: string }>> {
  const filenames = await listRuntimeBundleFilenames();
  return filenames.map((filename) => ({ filename }));
}

export async function GET(_request: Request, ctx: { params: Promise<{ filename: string }> }): Promise<NextResponse> {
  const { filename } = await ctx.params;
  const known = await listRuntimeBundleFilenames();
  if (!known.includes(filename)) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  const absPath = path.join(process.cwd(), ENGINE_DATA_DIR, 'runtime', filename);
  try {
    const st = await stat(absPath);
    if (!st.isFile()) return NextResponse.json({ error: 'not found' }, { status: 404 });
    const bytes = await readFile(absPath);
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        'content-type': 'text/javascript; charset=utf-8',
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
