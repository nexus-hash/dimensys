import * as React from 'react';
import { cn } from './utils';

const FIELD_CLASSES =
  'w-full rounded-control border border-line-hairline bg-surface-raised px-3 text-sm text-ink-primary placeholder:text-ink-muted ' +
  'outline-none transition-colors duration-micro focus-visible:border-brand focus-visible:outline focus-visible:outline-2 ' +
  'focus-visible:outline-brand focus-visible:outline-offset-2 disabled:opacity-45 disabled:pointer-events-none ' +
  'aria-[invalid=true]:border-signal-critical';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(FIELD_CLASSES, 'h-9', className)} {...props} />;
  },
);

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={cn(FIELD_CLASSES, 'min-h-20 py-2', className)} {...props} />;
  },
);
