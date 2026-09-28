import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { RichText } from '../RichText';

function html(text: string) {
  const { container } = render(<p>
    <RichText text={text} />
  </p>);
  return container.querySelector('p')!;
}

describe('RichText', () => {
  it('sets values (with their units) in value spans', () => {
    const p = html('Redis is gone. ~3,960 reads/s now hit a DB sized for 3,000.');
    expect([...p.querySelectorAll('b.v')].map((b) => b.textContent)).toEqual(['~3,960 reads/s', '3,000']);
  });

  it('keeps percentages, money and multipliers whole, and leaves digits inside words alone', () => {
    const p = html('p99 climbs to ~1.2 s; 38% fail; +$745/mo; 3.5× capacity');
    expect([...p.querySelectorAll('b.v')].map((b) => b.textContent)).toEqual(['~1.2 s', '38%', '+$745/mo', '3.5×']);
    expect(p.textContent).toContain('p99 climbs');
  });

  it('renders bold, italic and code, and nothing else as markup', () => {
    const p = html('Redis is back, but **cold**, *slowly* `warm` <img src=x>');
    expect(p.querySelector('strong')?.textContent).toBe('cold');
    expect(p.querySelector('em')?.textContent).toBe('slowly');
    expect(p.querySelector('code')?.textContent).toBe('warm');
    expect(p.querySelector('img')).toBeNull();
    expect(p.textContent).toContain('<img src=x>');
  });

  it('highlights values inside bold text too', () => {
    const p = html('Cassandra is still at **~280%** of capacity');
    expect(p.querySelector('strong b.v')?.textContent).toBe('~280%');
  });
});
