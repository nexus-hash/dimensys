import { describe, it, expect } from 'vitest';
import { render } from './test-utils';
import { CodeBlock } from '../CodeBlock';

describe('CodeBlock', () => {
  it('renders a code block with language', async () => {
    const code = 'const x = 42;';
    const element = await CodeBlock({ code, language: 'typescript' });
    const { container } = render(element);

    const shikiPre = container.querySelector('pre.shiki');
    expect(shikiPre).toBeTruthy();
    expect(container.textContent).toContain('typescript');
    expect(container.textContent).toContain('const x = 42;');
  });

  it('highlights TypeScript with real Shiki tokens, not a single plain span', async () => {
    const code = `const greeting = "hello";`;
    const element = await CodeBlock({ code, language: 'typescript' });
    const { container } = render(element);

    const pre = container.querySelector('pre.shiki');
    expect(pre).toBeTruthy();

    // Every token is a <span style="--shiki-light:...;--shiki-dark:...">.
    const tokenSpans = Array.from(pre!.querySelectorAll('span[style*="--shiki-light"]'));
    expect(tokenSpans.length).toBeGreaterThan(1);

    // The keyword ("const") and the string ("hello") must be different
    // colors — i.e. real syntax highlighting, not one plain span.
    const colors = new Set(tokenSpans.map((el) => el.getAttribute('style')));
    expect(colors.size).toBeGreaterThan(1);

    const keywordSpan = tokenSpans.find((el) => el.textContent === 'const');
    const stringSpan = tokenSpans.find((el) => el.textContent?.includes('hello'));
    expect(keywordSpan).toBeTruthy();
    expect(stringSpan).toBeTruthy();
    expect(keywordSpan!.getAttribute('style')).not.toBe(stringSpan!.getAttribute('style'));
  });

  it('renders a code block without a language as plain (unhighlighted) text', async () => {
    const code = 'plain text code';
    const element = await CodeBlock({ code });
    const { container } = render(element);

    const pre = container.querySelector('pre.shiki');
    expect(pre).toBeTruthy();
    expect(container.textContent).toContain('plain text code');
  });

  it('adds the line-numbers class when showLineNumbers is true', async () => {
    const code = 'line 1\nline 2\nline 3';
    const element = await CodeBlock({
      code,
      language: 'text',
      showLineNumbers: true,
    });
    const { container } = render(element);

    expect(container.querySelector('code.shiki-line-numbers')).toBeTruthy();
  });

  it('does not add the line-numbers class when showLineNumbers is false', async () => {
    const code = 'line 1\nline 2';
    const element = await CodeBlock({
      code,
      language: 'text',
      showLineNumbers: false,
    });
    const { container } = render(element);

    expect(container.querySelector('code.shiki-line-numbers')).toBeFalsy();
    expect(container.textContent).toContain('line 1');
    expect(container.textContent).toContain('line 2');
  });

  it('trims trailing newlines from code', async () => {
    const code = 'const x = 42;\n\n';
    const element = await CodeBlock({ code, language: 'typescript' });
    const { container } = render(element);

    const lines = container.querySelectorAll('pre.shiki .line');
    expect(lines.length).toBe(1);
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

  it('colors tokens via --shiki-light/--shiki-dark CSS variables, consumed by app/globals.css', async () => {
    const code = 'const x = 42;';
    const element = await CodeBlock({ code, language: 'typescript' });
    const { container } = render(element);

    const pre = container.querySelector('pre.shiki')!;
    const tokenSpan = pre.querySelector('span[style]')!;
    // The variables carry the color; nothing in our own source ever writes
    // a hex literal (enforced separately by `npm run lint:colors`).
    expect(tokenSpan.getAttribute('style')).toMatch(/--shiki-light:/);
    expect(tokenSpan.getAttribute('style')).toMatch(/--shiki-dark:/);
  });
});
