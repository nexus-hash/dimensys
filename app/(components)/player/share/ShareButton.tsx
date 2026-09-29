'use client';

import { useEffect, useRef, useState } from 'react';
import { Button, IconButton, Input, Popover, toast } from '@/app/(components)/ui';
import { ShareIcon } from '@/app/(components)/ui/icons';
import { useShortcut } from '@/app/(components)/command';
import { usePlayerStoreApi } from '../store/PlayerStoreProvider';
import { useWalkthroughData } from '../walkthrough/WalkthroughContext';
import { shareUrl } from './ShareController';

async function copyText(text: string): Promise<boolean> {
  try {
    if (!navigator.clipboard?.writeText) return false;
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Copies a link to exactly what's on screen (the run, mode, step,
 * selection, view and time). Where the clipboard isn't available, it opens
 * the link in a small field, selected, to copy by hand. ⌘⇧S / Ctrl+Shift+S
 * does the same (registered once, by the full-size button).
 */
export function ShareButton({ compact = false }: { compact?: boolean }) {
  const store = usePlayerStoreApi();
  const { walkthroughs } = useWalkthroughData();
  const [fallback, setFallback] = useState<string | null>(null);
  const fieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (fallback === null) return;
    const id = requestAnimationFrame(() => fieldRef.current?.select());
    return () => cancelAnimationFrame(id);
  }, [fallback]);

  async function share() {
    const url = shareUrl(store, walkthroughs);
    if (await copyText(url)) {
      setFallback(null);
      toast('Link copied · state encoded');
    } else {
      setFallback(url);
    }
  }

  useShortcut(
    { id: 'player:share', keys: 'mod+shift+s', label: 'Copy a link to this moment', group: 'Player', when: 'player' },
    (event) => {
      event.preventDefault();
      void share();
    },
    !compact,
  );

  const trigger = compact ? (
    <IconButton aria-label="Share" className="player-phone-only" data-share-button>
      <ShareIcon />
    </IconButton>
  ) : (
    <Button variant="ghost" size="sm" className="player-desktop-only" data-share-button>
      <ShareIcon />
      Share
    </Button>
  );

  return (
    <Popover
      trigger={trigger}
      open={fallback !== null}
      onOpenChange={(next) => {
        if (next) void share();
        else setFallback(null);
      }}
      align="end"
      aria-label="Share link"
    >
      <div className="grid w-[min(360px,calc(100vw-32px))] gap-2 p-1">
        <label htmlFor="player-share-url" className="text-caption text-ink-secondary">
          Copy this link to share exactly this moment
        </label>
        <Input
          id="player-share-url"
          ref={fieldRef}
          readOnly
          value={fallback ?? ''}
          onFocus={(e) => e.currentTarget.select()}
          className="font-mono text-mono-sm"
          data-share-url
        />
      </div>
    </Popover>
  );
}
