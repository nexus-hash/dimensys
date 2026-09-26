import { describe, it, expect } from 'vitest';
import { render } from './test-utils';
import { AnnotatedCode } from '../AnnotatedCode';

describe('AnnotatedCode', () => {
  it('renders code with annotations, highlighted', async () => {
    const code = 'const x = 42;\nconst y = 24;';
    const element = await AnnotatedCode({
      code,
      language: 'typescript',
      annotations: [{ lineNumber: 1, note: 'First variable' }],
    });
    const { container } = render(element);

    expect(container.querySelector('pre.shiki')).toBeTruthy();
    expect(container.textContent).toContain('const x = 42;');
    expect(container.textContent).toContain('First variable');
  });

  it('renders highlighted lines with the shiki-line-highlight class', async () => {
    const code = 'line 1\nline 2\nline 3';
    const element = await AnnotatedCode({
      code,
      language: 'text',
      highlightLines: [2],
    });
    const { container } = render(element);

    const lines = container.querySelectorAll('pre.shiki .line');
    expect(lines.length).toBe(3);
    expect(lines[1].className).toContain('shiki-line-highlight');
    expect(lines[0].className).not.toContain('shiki-line-highlight');
    expect(lines[2].className).not.toContain('shiki-line-highlight');
    expect(container.textContent).toContain('line 2');
  });

  it('renders annotation markers as real, visible note text on the annotated line', async () => {
    const code = 'const x = 42;';
    const element = await AnnotatedCode({
      code,
      language: 'typescript',
      showLineNumbers: true,
      annotations: [{ lineNumber: 1, note: 'Important' }],
    });
    const { container } = render(element);

    const line = container.querySelector('pre.shiki .line')!;
    expect(line.className).toContain('shiki-line-annotated');
    const marker = line.querySelector('.shiki-annotation-marker');
    expect(marker).toBeTruthy();
    expect(marker!.textContent).toBe('Important');
    // Appears twice: once as the inline marker, once in the legend below.
    expect(container.textContent?.match(/Important/g)?.length).toBe(2);
  });

  it('renders annotations legend', async () => {
    const code = 'line 1\nline 2';
    const annotations = [
      { lineNumber: 1, note: 'First' },
      { lineNumber: 2, note: 'Second' },
    ];
    const element = await AnnotatedCode({
      code,
      language: 'text',
      annotations,
    });
    const { container } = render(element);

    expect(container.textContent).toContain('Annotations');
    expect(container.textContent).toContain('Line 1: First');
    expect(container.textContent).toContain('Line 2: Second');
  });

  it('does not render annotations legend when no annotations', async () => {
    const code = 'const x = 42;';
    const element = await AnnotatedCode({
      code,
      language: 'typescript',
    });
    const { container } = render(element);

    const legendCount = (container.textContent?.match(/Annotations/g) || []).length;
    expect(legendCount).toBe(0);
  });

  it('renders line numbers by default', async () => {
    const code = 'line 1\nline 2';
    const element = await AnnotatedCode({
      code,
      language: 'text',
    });
    const { container } = render(element);

    expect(container.querySelector('code.shiki-line-numbers')).toBeTruthy();
  });

  it('hides line numbers when showLineNumbers is false', async () => {
    const code = 'line 1\nline 2';
    const element = await AnnotatedCode({
      code,
      language: 'text',
      showLineNumbers: false,
    });
    const { container } = render(element);

    expect(container.querySelector('code.shiki-line-numbers')).toBeFalsy();
    expect(container.textContent).toContain('line 1');
    expect(container.textContent).toContain('line 2');
  });

  it('handles both annotations and highlighted lines on the same block', async () => {
    const code = 'line 1\nline 2\nline 3';
    const element = await AnnotatedCode({
      code,
      language: 'text',
      annotations: [{ lineNumber: 1, note: 'Note 1' }],
      highlightLines: [2, 3],
    });
    const { container } = render(element);

    const lines = container.querySelectorAll('pre.shiki .line');
    expect(lines[0].className).toContain('shiki-line-annotated');
    expect(lines[1].className).toContain('shiki-line-highlight');
    expect(lines[2].className).toContain('shiki-line-highlight');
    expect(container.textContent).toContain('Note 1');
    expect(container.textContent).toContain('line 1');
    expect(container.textContent).toContain('line 2');
    expect(container.textContent).toContain('line 3');
  });

  it('applies custom className', async () => {
    const code = 'test';
    const element = await AnnotatedCode({
      code,
      language: 'text',
      className: 'custom-class',
    });
    const { container } = render(element);

    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain('custom-class');
  });
});
