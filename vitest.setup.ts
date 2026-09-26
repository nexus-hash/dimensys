import '@testing-library/jest-dom/vitest';

// jsdom doesn't implement these; several Radix primitives (Popper-based
// positioning, the reduced-motion hook) call them unconditionally.
if (typeof window !== 'undefined') {
  if (!window.matchMedia) {
    window.matchMedia = (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
  }

  if (!window.ResizeObserver) {
    class ResizeObserverPolyfill {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    window.ResizeObserver = ResizeObserverPolyfill as unknown as typeof ResizeObserver;
  }

  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false;
  }
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = () => {};
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = () => {};
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
  }

  // On this Node version, the runtime's own experimental `localStorage`
  // claims the global before jsdom's working `window.localStorage` can, and
  // it's inert without a `--localstorage-file` path (every call is a no-op
  // returning undefined). Replace it with a real in-memory Storage so code
  // that reads/writes `localStorage` (recent items, saved progress, …)
  // behaves the same in tests as it does in a browser.
  if (typeof (window as unknown as { localStorage?: Storage }).localStorage?.setItem !== 'function') {
    class MemoryStorage implements Storage {
      private store = new Map<string, string>();
      get length() {
        return this.store.size;
      }
      clear(): void {
        this.store.clear();
      }
      getItem(key: string): string | null {
        return this.store.has(key) ? this.store.get(key)! : null;
      }
      key(index: number): string | null {
        return [...this.store.keys()][index] ?? null;
      }
      removeItem(key: string): void {
        this.store.delete(key);
      }
      setItem(key: string, value: string): void {
        this.store.set(key, String(value));
      }
    }
    const memoryStorage = new MemoryStorage();
    Object.defineProperty(window, 'localStorage', { value: memoryStorage, configurable: true });
    Object.defineProperty(globalThis, 'localStorage', { value: memoryStorage, configurable: true });
  }
}
