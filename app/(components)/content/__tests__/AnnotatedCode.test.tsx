import { describe, it, expect } from 'vitest';
import { render } from './test-utils';
import { AnnotatedCode } from '../AnnotatedCode';

describe('AnnotatedCode', () => {
  it('renders code with annotations', async () => {
    const code = 'const x = 42;\nconst y = 24;';
    const element = await AnnotatedCode({
      code,
      language: 'typescript',
      annotations: [{ lineNumber: 1, note: 'First variable' }],
    });
    const { container } = render(element);

    expect(container.textContent).toContain('const x = 42;');
    expect(container.textContent).toContain('First variable');
  });

  it('renders highlighted lines with visual indicator', async () => {
    const code = 'line 1\nline 2\nline 3';
    const element = await AnnotatedCode({
      code,
      language: 'text',
      highlightLines: [2],
    });
    const { container } = render(element);

    const highlightedLine = container.querySelector('[class*="border-l-2"]');
    expect(highlightedLine).toBeTruthy();
    expect(container.textContent).toContain('line 2');
  });

  it('renders annotation markers', async () => {
    const code = 'const x = 42;';
    const element = await AnnotatedCode({
      code,
      language: 'typescript',
      showLineNumbers: true,
      annotations: [{ lineNumber: 1, note: 'Important' }],
    });
    const { container } = render(element);

    // Check for annotation marker (●)
    expect(container.textContent).toContain('●');
    expect(container.textContent).toContain('Important');
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

    // Should not have the Annotations section
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

    // Line numbers should be present by default
    expect(container.textContent).toContain('1');
    expect(container.textContent).toContain('2');
  });

  it('hides line numbers when showLineNumbers is false', async () => {
    const code = 'line 1\nline 2';
    const element = await AnnotatedCode({
      code,
      language: 'text',
      showLineNumbers: false,
    });
    const { container } = render(element);

    // Code should be present but line numbers hidden
    expect(container.textContent).toContain('line 1');
    expect(container.textContent).toContain('line 2');
  });

  it('handles both annotations and highlighted lines', async () => {
    const code = 'line 1\nline 2\nline 3';
    const element = await AnnotatedCode({
      code,
      language: 'text',
      annotations: [{ lineNumber: 1, note: 'Note 1' }],
      highlightLines: [2, 3],
    });
    const { container } = render(element);

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
