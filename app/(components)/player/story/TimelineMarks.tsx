'use client';

import { useActivePlay, useStoryData } from './StoryContext';
import { useStoryUi } from './storyStore';
import { timelineMarks } from './model';
import { fmtSimTime } from '../metrics/simTime';

/**
 * The scrubber's marks for the running scenario: a tick per timed event and
 * a diamond per checkpoint (filled once answered), placed by time along the
 * track. Drawn under the scrubber's thumb; the same list is the
 * scrubber's description for screen readers.
 */
export function TimelineMarks({ duration, descId }: { duration: number; descId: string }) {
  const play = useActivePlay();
  const { names } = useStoryData();
  const answers = useStoryUi((s) => s.answers);
  if (!play || !(duration > 0)) return null;
  const marks = timelineMarks(play, answers, duration, names);
  if (marks.length === 0) return null;
  return (
    <>
      <div className="story-marks" aria-hidden="true" data-timeline-marks>
        {marks.map((m, i) => (
          <span
            key={i}
            className={m.kind === 'ask' ? 'story-mark-dia' : 'story-mark-tick'}
            data-mark={m.kind}
            data-done={m.done || undefined}
            style={{ left: `${(m.t / duration) * 100}%` }}
            title={`t=${fmtSimTime(m.t)} · ${m.label}`}
          />
        ))}
      </div>
      <span id={descId} className="sr-only">
        {marks.map((m) => `${fmtSimTime(m.t)} ${m.label}`).join('; ')}
      </span>
    </>
  );
}
