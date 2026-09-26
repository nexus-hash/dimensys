import { describe, it, expect } from 'vitest';
import { render } from './test-utils';
import { Markdown } from '../Markdown';

describe('Markdown', () => {
  it('renders headings', async () => {
    const content = '# Heading 1\n## Heading 2\n### Heading 3';
    const element = await Markdown({ content });
    const { container } = render(element);

    const h1 = container.querySelector('h1');
    const h2 = container.querySelector('h2');
    const h3 = container.querySelector('h3');

    expect(h1?.textContent).toContain('Heading 1');
    expect(h2?.textContent).toContain('Heading 2');
    expect(h3?.textContent).toContain('Heading 3');
  });

  it('renders paragraphs', async () => {
    const content = 'This is a paragraph.\n\nThis is another paragraph.';
    const element = await Markdown({ content });
    const { container } = render(element);

    const paragraphs = container.querySelectorAll('p');
    expect(paragraphs.length).toBeGreaterThanOrEqual(2);
  });

  it('renders bold and italic text', async () => {
    const content = 'This is **bold** and *italic* text.';
    const element = await Markdown({ content });
    const { container } = render(element);

    const strong = container.querySelector('strong');
    const em = container.querySelector('em');

    expect(strong?.textContent).toContain('bold');
    expect(em?.textContent).toContain('italic');
  });

  it('renders lists', async () => {
    const content = '- Item 1\n- Item 2\n- Item 3';
    const element = await Markdown({ content });
    const { container } = render(element);

    const ul = container.querySelector('ul');
    const items = container.querySelectorAll('li');

    expect(ul).toBeTruthy();
    expect(items.length).toBe(3);
  });

  it('renders tables', async () => {
    const content = '| Name | Age |\n|------|-----|\n| Alice | 30 |\n| Bob | 25 |';
    const element = await Markdown({ content });
    const { container } = render(element);

    const table = container.querySelector('table');
    const rows = container.querySelectorAll('tr');

    expect(table).toBeTruthy();
    expect(rows.length).toBeGreaterThanOrEqual(3);
  });

  it('renders inline code as an inline badge, not a code block', async () => {
    const content = 'Use `const x = 42;` in your code.';
    const element = await Markdown({ content });
    const { container } = render(element);

    const code = container.querySelector('code');
    expect(code?.textContent).toContain('const x = 42;');
    expect(code?.closest('pre')).toBeNull();
  });

  it('renders fenced code blocks through CodeBlock, highlighted', async () => {
    const content = '```typescript\nconst greeting = "hi";\n```';
    const element = await Markdown({ content });
    const { container } = render(element);

    const pre = container.querySelector('pre.shiki');
    expect(pre).toBeTruthy();
    expect(container.textContent).toContain('typescript');
    expect(container.textContent).toContain('const greeting = "hi";');

    // Real highlighting: the keyword and the string token get different
    // --shiki-light/--shiki-dark colors, not one plain span.
    const tokenSpans = Array.from(pre!.querySelectorAll('span[style*="--shiki-light"]'));
    expect(tokenSpans.length).toBeGreaterThan(1);
    const colors = new Set(tokenSpans.map((el) => el.getAttribute('style')));
    expect(colors.size).toBeGreaterThan(1);
  });

  it('renders blockquotes', async () => {
    const content = '> This is a quote';
    const element = await Markdown({ content });
    const { container } = render(element);

    const blockquote = container.querySelector('blockquote');
    expect(blockquote?.textContent).toContain('This is a quote');
  });

  it('renders links', async () => {
    const content = '[Click here](https://example.com)';
    const element = await Markdown({ content });
    const { container } = render(element);

    const link = container.querySelector('a');
    expect(link?.textContent).toContain('Click here');
    expect(link?.getAttribute('href')).toContain('example.com');
  });

  it('applies custom className', async () => {
    const content = '# Test';
    const element = await Markdown({ content, className: 'custom-class' });
    const { container } = render(element);

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('custom-class');
  });

  it('renders complex markdown with multiple elements, including a highlighted code block', async () => {
    const content = `# Main Heading

This is a paragraph with **bold** and *italic*.

## Subheading

- List item 1
- List item 2

\`\`\`json
{ "key": "value" }
\`\`\`

> A quote for context
`;
    const element = await Markdown({ content });
    const { container } = render(element);

    expect(container.querySelector('h1')).toBeTruthy();
    expect(container.querySelector('h2')).toBeTruthy();
    expect(container.querySelector('strong')).toBeTruthy();
    expect(container.querySelector('em')).toBeTruthy();
    expect(container.querySelector('ul')).toBeTruthy();
    expect(container.querySelector('blockquote')).toBeTruthy();
    expect(container.querySelector('pre.shiki')).toBeTruthy();
    expect(container.textContent).toContain('"key"');
  });
});
