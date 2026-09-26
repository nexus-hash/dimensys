export type ToastVariant = 'neutral' | 'ok' | 'critical';

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  duration: number;
}

export interface ToastInput {
  title: string;
  description?: string;
  variant?: ToastVariant;
  /** ms; 0 disables auto-dismiss. Default 4000. */
  duration?: number;
}

let queue: ToastItem[] = [];
const listeners = new Set<() => void>();
let nextId = 0;

function emit() {
  for (const l of listeners) l();
}

export function subscribeToasts(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getToastSnapshot(): ToastItem[] {
  return queue;
}

/** Imperative toast helper, callable from anywhere. */
export function toast(input: ToastInput | string): string {
  const props: ToastInput = typeof input === 'string' ? { title: input } : input;
  const id = `toast-${++nextId}`;
  queue = [...queue, { id, variant: 'neutral', duration: 4000, ...props }];
  emit();
  return id;
}

export function dismissToast(id: string): void {
  queue = queue.filter((t) => t.id !== id);
  emit();
}
