import { CodeBlock, AnnotatedCode, Markdown } from '@/app/(components)/content';
import { DevUiHeader } from '../DevUiChrome';

const TYPESCRIPT_EXAMPLE = `interface User {
  id: string;
  name: string;
  email: string;
}

function getUser(id: string): Promise<User> {
  return fetch(\`/api/users/\${id}\`)
    .then(res => res.json())
    .catch(err => console.error(err));
}`;

const JAVA_EXAMPLE = `public class User {
  private String id;
  private String name;
  private String email;

  public User(String id, String name, String email) {
    this.id = id;
    this.name = name;
    this.email = email;
  }

  public String getId() {
    return this.id;
  }
}`;

const PYTHON_EXAMPLE = `class User:
    def __init__(self, id: str, name: str, email: str):
        self.id = id
        self.name = name
        self.email = email

    def get_id(self) -> str:
        return self.id

    def display(self) -> None:
        print(f"User {self.name} ({self.email})")`;

const JSON_EXAMPLE = `{
  "users": [
    {
      "id": "1",
      "name": "Alice",
      "email": "alice@example.com"
    },
    {
      "id": "2",
      "name": "Bob",
      "email": "bob@example.com"
    }
  ]
}`;

const MARKDOWN_CONTENT = `# Markdown Example

This is a paragraph with **bold** and *italic* text, and \`inline code\`.

## Code Example

\`\`\`typescript
const greeting = "Hello, World!";
console.log(greeting);
\`\`\`

## Lists

- Item 1
- Item 2
  - Nested item

## Table

| Name  | Email               |
|-------|---------------------|
| Alice | alice@example.com   |
| Bob   | bob@example.com     |
`;

/**
 * ContentGallery: Dev-only component showcasing Markdown, CodeBlock, and AnnotatedCode.
 */
export default async function ContentGallery() {
  return (
    <div className="min-h-screen bg-surface-page px-6 py-8 text-ink-primary">
      <DevUiHeader
        current="/dev/ui/content"
        title="DS8 — Content kit gallery"
        description="Development only (404s in production). Server-rendered Markdown, CodeBlock, and AnnotatedCode components with Shiki highlighting, both themes."
      />
      <div className="max-w-6xl mx-auto">
        {/* CodeBlock Examples */}
        <section className="mb-16">
          <h2 className="text-title-1 font-semibold text-brand-ink mb-6 border-b border-line-hairline pb-2">
            CodeBlock Examples
          </h2>

          <div className="space-y-8">
            {/* TypeScript */}
            <div>
              <h3 className="text-title-3 font-semibold text-ink-primary dark:text-ink-primary mb-3">
                TypeScript
              </h3>
              <CodeBlock code={TYPESCRIPT_EXAMPLE} language="typescript" />
            </div>

            {/* TypeScript with line numbers */}
            <div>
              <h3 className="text-title-3 font-semibold text-ink-primary dark:text-ink-primary mb-3">
                TypeScript (with line numbers)
              </h3>
              <CodeBlock
                code={TYPESCRIPT_EXAMPLE}
                language="typescript"
                showLineNumbers={true}
              />
            </div>

            {/* Java */}
            <div>
              <h3 className="text-title-3 font-semibold text-ink-primary dark:text-ink-primary mb-3">
                Java
              </h3>
              <CodeBlock code={JAVA_EXAMPLE} language="java" />
            </div>

            {/* Python */}
            <div>
              <h3 className="text-title-3 font-semibold text-ink-primary dark:text-ink-primary mb-3">
                Python
              </h3>
              <CodeBlock code={PYTHON_EXAMPLE} language="python" />
            </div>

            {/* JSON */}
            <div>
              <h3 className="text-title-3 font-semibold text-ink-primary dark:text-ink-primary mb-3">
                JSON
              </h3>
              <CodeBlock code={JSON_EXAMPLE} language="json" showLineNumbers={true} />
            </div>

            {/* Plain text */}
            <div>
              <h3 className="text-title-3 font-semibold text-ink-primary dark:text-ink-primary mb-3">
                Plain Text
              </h3>
              <CodeBlock code="No language specified" language="text" />
            </div>
          </div>
        </section>

        {/* AnnotatedCode Examples */}
        <section className="mb-16">
          <h2 className="text-title-1 font-semibold text-brand-ink mb-6 border-b border-line-hairline pb-2">
            AnnotatedCode Examples
          </h2>

          <div className="space-y-8">
            {/* With annotations */}
            <div>
              <h3 className="text-title-3 font-semibold text-ink-primary dark:text-ink-primary mb-3">
                TypeScript with Annotations
              </h3>
              <AnnotatedCode
                code={TYPESCRIPT_EXAMPLE}
                language="typescript"
                annotations={[
                  { lineNumber: 1, note: 'Interface definition starts here' },
                  { lineNumber: 6, note: 'Async function with error handling' },
                ]}
              />
            </div>

            {/* With highlighted lines */}
            <div>
              <h3 className="text-title-3 font-semibold text-ink-primary dark:text-ink-primary mb-3">
                Python with Highlighted Lines
              </h3>
              <AnnotatedCode
                code={PYTHON_EXAMPLE}
                language="python"
                highlightLines={[1, 5, 10]}
                annotations={[
                  { lineNumber: 1, note: 'Class definition' },
                  { lineNumber: 5, note: 'Getter method' },
                  { lineNumber: 10, note: 'Display method' },
                ]}
              />
            </div>

            {/* Java with highlights only */}
            <div>
              <h3 className="text-title-3 font-semibold text-ink-primary dark:text-ink-primary mb-3">
                Java with Highlighted Lines (No Annotations)
              </h3>
              <AnnotatedCode
                code={JAVA_EXAMPLE}
                language="java"
                highlightLines={[2, 3, 4]}
              />
            </div>
          </div>
        </section>

        {/* Markdown Example */}
        <section className="mb-16">
          <h2 className="text-title-1 font-semibold text-brand-ink mb-6 border-b border-line-hairline pb-2">
            Markdown Example
          </h2>
          <Markdown content={MARKDOWN_CONTENT} />
        </section>

        {/* Feature showcase */}
        <section>
          <h2 className="text-title-1 font-semibold text-brand-ink mb-6 border-b border-line-hairline pb-2">
            Features
          </h2>
          <ul className="space-y-3 text-body-lg">
            <li className="flex gap-3">
              <span className="text-brand-ink font-bold">✓</span>
              <span>
                <strong>Server-side highlighting:</strong> Shiki highlights code on the server,
                no highlighter shipped to the client
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-brand-ink font-bold">✓</span>
              <span>
                <strong>Dual themes:</strong> Light and dark themes via CSS variables, switched
                by data-theme attribute
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-brand-ink font-bold">✓</span>
              <span>
                <strong>Language chip:</strong> Shows the language for each code block
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-brand-ink font-bold">✓</span>
              <span>
                <strong>Line numbers:</strong> Optional line numbers for easy reference
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-brand-ink font-bold">✓</span>
              <span>
                <strong>Copy button:</strong> Tiny client-side copy button with tooltip feedback
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-brand-ink font-bold">✓</span>
              <span>
                <strong>Annotations:</strong> Per-line notes with visual markers and keyboard
                accessibility
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-brand-ink font-bold">✓</span>
              <span>
                <strong>Highlighted lines:</strong> Subtle background and left border for
                important lines
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-brand-ink font-bold">✓</span>
              <span>
                <strong>Typography tokens:</strong> Uses app&apos;s design tokens, no hex colors
              </span>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
