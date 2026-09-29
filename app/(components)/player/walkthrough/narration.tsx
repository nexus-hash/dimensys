import type { ReactNode } from 'react';
import { Markdown } from '@/app/(components)/content/Markdown';
import type { ProsePart, ViewData } from '../types';
import { stepKey, stepSheet } from './model';

/**
 * Every step's narration, rendered on the server (markdown never ships as a
 * client-side parser), keyed by `stepKey`. A step with no narration of its
 * own falls back to the prose of the detail panel it carries, if any.
 */
export function buildWalkthroughNarration(diagram: Pick<ViewData, 'stories'>): Record<string, ReactNode> {
  const out: Record<string, ReactNode> = {};
  for (const story of diagram.stories) {
    for (const frame of story.frames) {
      const key = stepKey(story.id, frame.id);
      if (frame.md) {
        out[key] = <Markdown content={frame.md} className="text-body" />;
        continue;
      }
      const prose = (stepSheet(frame)?.parts ?? []).filter((p): p is ProsePart => p.shape === 'prose');
      if (prose.length === 0) continue;
      out[key] = (
        <ol className="wt-narr-parts">
          {prose.map((part, i) => (
            <li key={i}>
              <b>{part.title}</b> <Markdown content={part.md} className="text-body" />
            </li>
          ))}
        </ol>
      );
    }
  }
  return out;
}
