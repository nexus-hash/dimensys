'use client';

import React, { useState } from 'react';
import { Tooltip } from '../ui/Tooltip';
import { Button } from '../ui/Button';

interface CopyButtonProps {
  code: string;
}

/**
 * CopyButton: Client Component that handles copying code to clipboard.
 * Tiny client-side JS, only thing shipped to the client from CodeBlock.
 */
export default function CopyButton({ code }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <Tooltip content={copied ? 'Copied!' : 'Copy code'}>
      <Button
        variant="ghost"
        size="sm"
        iconOnly
        aria-label={copied ? 'Copied' : 'Copy code'}
        onClick={handleCopy}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
      </Button>
    </Tooltip>
  );
}
