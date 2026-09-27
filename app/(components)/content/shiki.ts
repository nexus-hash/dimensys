import { createHighlighter, type Highlighter, type ShikiTransformer } from 'shiki';

/**
 * shiki.ts — server-only Shiki singleton (DS8).
 *
 * This module is imported only by Server Components (CodeBlock, AnnotatedCode,
 * Markdown) and never by a 'use client' file, so the highlighter, its
 * grammars and its WASM engine stay out of every client bundle. Only the
 * highlighted HTML string (plain markup + `--shiki-*` CSS variable
 * references) crosses the server/client boundary.
 *
 * A single highlighter instance is cached at module scope (one per server
 * process) and languages are loaded lazily, on first use, so a request that
 * only ever renders TypeScript never pays for Python/Java/Go/SQL grammars.
 */

// Dual light/dark Shiki themes. Token colors are emitted as CSS variables
// (`defaultColor: false` below) so the actual color used is decided by CSS —
// see the `.shiki` rules in app/globals.css, switched by `html[data-theme]`.
//
// The light theme is the "high-contrast" GitHub variant, not the plain
// `github-light` one: on the `--surface-raised` code background this app
// uses, plain `github-light`'s `keyword`/`storage` token color and its
// `variable` token color measure only ~4.4:1 and ~3.3:1 against it — both
// below the 4.5:1 WCAG AA text threshold. `github-light-high-contrast`
// remaps those same scopes to darker shades of the same hues (~7.75:1 and
// ~9.82:1); every token color it defines for the languages this app
// highlights (ts/tsx/js/jsx/java/py/json/bash/go/sql/md — see
// LANGUAGE_ALIASES below) clears 4.5:1 against that background. It ships in
// the already-installed `shiki` package, so this is a theme choice, not a
// new dependency. `github-dark` (unchanged) already passes.
const THEMES = { light: 'github-light-high-contrast', dark: 'github-dark' } as const;

// The only languages this app ever highlights. Anything else falls back to
// plain text — this keeps the set of lazily-imported Shiki grammars fixed
// and small instead of letting an arbitrary `language` prop pull in one of
// Shiki's ~200 bundled grammars.
const LANGUAGE_ALIASES: Record<string, string> = {
  ts: 'typescript',
  typescript: 'typescript',
  tsx: 'tsx',
  js: 'javascript',
  javascript: 'javascript',
  jsx: 'jsx',
  java: 'java',
  py: 'python',
  python: 'python',
  json: 'json',
  bash: 'bash',
  sh: 'bash',
  shell: 'bash',
  go: 'go',
  golang: 'go',
  sql: 'sql',
  md: 'markdown',
  markdown: 'markdown',
};

let highlighterPromise: Promise<Highlighter> | null = null;
const loadedLanguages = new Set<string>(['text']);

function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: [THEMES.light, THEMES.dark],
      // No languages loaded up front — each is pulled in on first use by
      // ensureLanguageLoaded, below.
      langs: [],
    });
  }
  return highlighterPromise;
}

/** Resolve a caller-supplied language string to a Shiki grammar id, or 'text'. */
function resolveLanguage(language: string | undefined): string {
  if (!language) return 'text';
  return LANGUAGE_ALIASES[language.toLowerCase()] ?? 'text';
}

async function ensureLanguageLoaded(highlighter: Highlighter, lang: string): Promise<void> {
  if (lang === 'text' || loadedLanguages.has(lang)) return;
  await highlighter.loadLanguage(lang as Parameters<Highlighter['loadLanguage']>[0]);
  loadedLanguages.add(lang);
}

export interface HighlightOptions {
  /** Adds a `shiki-line-numbers` class to <code>, enabling the CSS-counter gutter. */
  showLineNumbers?: boolean;
  /** Additional Shiki transformers (e.g. line highlight/annotation classes). */
  transformers?: ShikiTransformer[];
}

/**
 * Highlight `code` on the server and return the Shiki-generated HTML
 * (`<pre class="shiki">...</pre>`), with tokens colored via `--shiki-light`
 * / `--shiki-dark` CSS variables rather than inline hex.
 */
export async function highlightToHtml(
  code: string,
  language: string | undefined,
  options: HighlightOptions = {}
): Promise<{ html: string; lang: string }> {
  const lang = resolveLanguage(language);
  const highlighter = await getHighlighter();
  await ensureLanguageLoaded(highlighter, lang);

  const lineNumbersTransformer: ShikiTransformer = {
    name: 'dimensys-line-numbers',
    code(hast) {
      if (options.showLineNumbers) {
        this.addClassToHast(hast, 'shiki-line-numbers');
      }
      return hast;
    },
  };

  const html = highlighter.codeToHtml(code, {
    lang,
    themes: THEMES,
    defaultColor: false,
    transformers: [lineNumbersTransformer, ...(options.transformers ?? [])],
  });

  return { html, lang };
}

/**
 * A Shiki transformer that marks highlighted lines (2px left bar + subtle
 * background, via CSS) and appends a real, visible annotation note to any
 * line that has one — implemented as line/token classes on the highlighted
 * HAST tree, not by re-rendering the code as plain text.
 */
export function createLineDecorationTransformer(opts: {
  highlightLines?: Set<number>;
  annotations?: Map<number, string>;
}): ShikiTransformer {
  return {
    name: 'dimensys-line-decorations',
    line(hast, line) {
      const classes: string[] = [];
      if (opts.highlightLines?.has(line)) classes.push('shiki-line-highlight');
      const note = opts.annotations?.get(line);
      if (note) classes.push('shiki-line-annotated');
      if (classes.length > 0) {
        this.addClassToHast(hast, classes);
      }

      if (note) {
        hast.children.push({
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['shiki-annotation-marker'],
            role: 'note',
            'aria-label': `Annotation: ${note}`,
          },
          children: [{ type: 'text', value: note }],
        });
      }

      return hast;
    },
  };
}
