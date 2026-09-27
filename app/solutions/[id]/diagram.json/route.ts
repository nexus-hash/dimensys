import { NextResponse } from 'next/server';
import { listDiagramIds, loadPlayerDiagram } from '@/app/(server)/engine/publicData';

/**
 * Static JSON route for the full view-data document (T3.13): the sim
 * runtime worker fetches this itself, rather than the document going
 * through React props (which would double it into the HTML and the RSC
 * payload). `force-static` plus `generateStaticParams` below emits one
 * static file per diagram id at build time; the `?h=` query the caller
 * appends (`diagramJsonUrl` in `DiagramPlayer.tsx`) is the build hash, so
 * responses can be cached forever without ever going stale silently.
 */
export const dynamic = 'force-static';
export const dynamicParams = false;

export async function generateStaticParams(): Promise<Array<{ id: string }>> {
  const ids = await listDiagramIds();
  return ids.map((id) => ({ id }));
}

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await ctx.params;
  const diagram = await loadPlayerDiagram(id);
  if (!diagram) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  return NextResponse.json(diagram, {
    headers: { 'cache-control': 'public, max-age=31536000, immutable' },
  });
}
