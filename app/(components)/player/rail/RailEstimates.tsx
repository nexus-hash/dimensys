'use client';

import { CalcPanel } from '../inspector/CalcPanel';
import type { CalcPart, CalcView } from '../types';

/** The design-wide sizing calculator, drawn with the inspector's own calculator under the rail's "Estimates" heading. */
export function RailEstimates({ calc }: { calc: CalcView }) {
  const part: CalcPart = { shape: 'calc', calc: calc.id, title: 'Estimates', pane: 'overview' };
  return (
    <div data-rail-estimate={calc.id}>
      <CalcPanel part={part} calc={calc} heading={false} />
    </div>
  );
}
