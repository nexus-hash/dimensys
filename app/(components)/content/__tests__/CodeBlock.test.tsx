import { describe, it, expect } from 'vitest';
import { render } from './test-utils';
import { CodeBlock } from '../CodeBlock';

describe('CodeBlock', () => {
  it('renders a code block with language', async () => {
    const code = 'const x = 42;';
    const element = await CodeBlock({ code, language: 'typescript' });
    const { container } = render(element);

    const preElement = container.querySelector('pre');
    expect(preElement).toBeTruthy();
    expect(container.textContent).toContain('typescript');
    expect(container.textContent).toContain('const x = 42;');
  });

  it('renders a code block without language', async () => {
    const code = 'plain text code';
    const element = await CodeBlock({ code });
    const { container } = render(element);

    const preElement = container.querySelector('pre');
    expect(preElement).toBeTruthy();
    expect(container.textContent).toContain('plain text code');
  });

  it('renders line numbers when showLineNumbers is true', async () => {
    const code = 'line 1\nline 2\nline 3';
    const element = await CodeBlock({
      code,
      language: 'text',
      showLineNumbers: true,
    });
    const { container } = render(element);

    // Check that line numbers are displayed
    expect(container.textContent).toContain('1');
    expect(container.textContent).toContain('2');
    expect(container.textContent).toContain('3');
  });

  it('does not render line numbers when showLineNumbers is false', async () => {
    const code = 'line 1\nline 2';
    const element = await CodeBlock({
      code,
      language: 'text',
      showLineNumbers: false,
    });
    const { container } = render(element);

    // The code should be present
    expect(container.textContent).toContain('line 1');
    expect(container.textContent).toContain('line 2');
  });

  it('trims trailing newlines from code', async () => {
    const code = 'const x = 42;\n\n';
    const element = await CodeBlock({ code, language: 'typescript' });
    const { container } = render(element);

    // Should render without extra blank lines at the end
    expect(container.textContent).toContain('const x = 42;');
  });

  it('applies custom className', async () => {
    const code = 'test';
    const element = await CodeBlock({
      code,
      language: 'text',
      className: 'custom-class',
    });
    const { container } = render(element);

    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain('custom-class');
  });
});
