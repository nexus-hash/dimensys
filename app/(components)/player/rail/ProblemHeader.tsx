import { Pill } from '@/app/(components)/ui';
import { gradeDots, type RailProblem } from './data';

/** The rail's problem header: the title and its level, difficulty and time pills. */
export function ProblemHeader({ problem }: { problem: RailProblem }) {
  const dots = gradeDots(problem.grade);
  return (
    <div className="grid gap-2.5" data-rail-problem>
      <p className="rail-prob-title">{problem.title}</p>
      <ul className="flex flex-wrap gap-1.5" aria-label="About this problem">
        <li>
          <Pill>
            <span className="sr-only">Level: </span>
            {problem.level}
          </Pill>
        </li>
        <li>
          <Pill>
            <span className="sr-only">Difficulty: </span>
            {problem.grade}
            {dots !== null ? (
              <span className="rail-dots" aria-hidden="true">
                {'●'.repeat(dots)}
                {'○'.repeat(3 - dots)}
              </span>
            ) : null}
          </Pill>
        </li>
        {problem.minutes !== undefined ? (
          <li>
            <Pill>
              <span className="sr-only">Estimated time: </span>
              {problem.minutes} min
            </Pill>
          </li>
        ) : null}
      </ul>
    </div>
  );
}
