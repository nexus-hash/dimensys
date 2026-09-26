'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import {
  Button,
  IconButton,
  Pill,
  Kbd,
  SegmentedControl,
  Tabs,
  TabsContent,
  Switch,
  Slider,
  Select,
  Input,
  Textarea,
  Tooltip,
  Popover,
  Dialog,
  Sheet,
  BottomSheet,
  DropdownMenu,
  ContextMenu,
  toast,
  CloseIcon,
  InfoIcon,
} from '@/app/(components)/ui';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-4 border-b border-line-hairline pb-2 text-title-2 text-ink-primary">{title}</h2>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="w-32 flex-none font-mono text-[12px] text-ink-muted">{label}</span>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

export function DevUiGallery() {
  const { resolvedTheme, setTheme } = useTheme();
  const [motionOff, setMotionOff] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  React.useEffect(() => {
    document.documentElement.setAttribute('data-motion', motionOff ? 'off' : 'on');
  }, [motionOff]);

  const [segValue, setSegValue] = React.useState('explore');
  const [tabValue, setTabValue] = React.useState('overview');
  const [switchOn, setSwitchOn] = React.useState(true);
  const [rps, setRps] = React.useState(400);
  const [zoom, setZoom] = React.useState(1);
  const [selectValue, setSelectValue] = React.useState('hld');
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [bottomSheetOpen, setBottomSheetOpen] = React.useState(false);
  const avoidRef = React.useRef<HTMLDivElement>(null);

  return (
    <div className="min-h-screen bg-surface-page px-6 py-8 text-ink-primary">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-line-hairline pb-4">
        <div>
          <h1 className="text-title-1">DS3 — UI primitives gallery</h1>
          <p className="mt-1 text-body text-ink-secondary">
            Development only (404s in production). Every primitive, every state, both themes.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-body text-ink-secondary">
            <Switch checked={motionOff} onCheckedChange={setMotionOff} aria-label="Toggle reduced motion (data-motion)" />
            data-motion=off
          </label>
          <Button
            variant="glass"
            size="sm"
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          >
            {mounted ? `Theme: ${resolvedTheme}` : 'Theme'}
          </Button>
        </div>
      </header>

      <Section title="Button">
        <Row label="primary">
          <Button variant="primary" size="sm">Kill the cache</Button>
          <Button variant="primary" size="md">Kill the cache</Button>
          <Button variant="primary" size="lg">Kill the cache</Button>
          <Button variant="primary" disabled>Disabled</Button>
        </Row>
        <Row label="glass">
          <Button variant="glass">Apply fix</Button>
          <Button variant="glass" disabled>Disabled</Button>
        </Row>
        <Row label="ghost">
          <Button variant="ghost">Copy result</Button>
          <Button variant="ghost" disabled>Disabled</Button>
        </Row>
        <Row label="danger">
          <Button variant="danger">Delete scenario</Button>
          <Button variant="danger" disabled>Disabled</Button>
        </Row>
        <Row label="icon-only">
          <Button variant="glass" iconOnly aria-label="Close">
            <CloseIcon />
          </Button>
        </Row>
      </Section>

      <Section title="IconButton">
        <Row label="ghost/glass">
          <IconButton aria-label="Info"><InfoIcon /></IconButton>
          <IconButton variant="glass" aria-label="Info"><InfoIcon /></IconButton>
          <IconButton aria-label="Pressed" pressed><InfoIcon /></IconButton>
          <IconButton aria-label="Disabled" disabled><InfoIcon /></IconButton>
        </Row>
      </Section>

      <Section title="Pill / Badge">
        <Row label="variants">
          <Pill variant="neutral">neutral</Pill>
          <Pill variant="brand">api · x4</Pill>
          <Pill variant="ok">✓ healthy</Pill>
          <Pill variant="warn">! p99 640ms</Pill>
          <Pill variant="critical">✕ err 38%</Pill>
        </Row>
      </Section>

      <Section title="Kbd">
        <Row label="keys">
          <Kbd>K</Kbd>
          <Kbd>⌘</Kbd>
          <Kbd>⇧</Kbd>
          <Kbd>Esc</Kbd>
        </Row>
      </Section>

      <Section title="SegmentedControl">
        <Row label="modes">
          <SegmentedControl
            aria-label="Player mode"
            value={segValue}
            onValueChange={setSegValue}
            options={[
              { value: 'explore', label: 'Explore', hint: <Kbd>1</Kbd> },
              { value: 'break', label: 'Break it', hint: <Kbd>2</Kbd> },
              { value: 'walkthrough', label: 'Walkthrough', hint: <Kbd>3</Kbd> },
              { value: 'disabled', label: 'Build', disabled: true },
            ]}
          />
        </Row>
      </Section>

      <Section title="Tabs">
        <Tabs
          aria-label="Inspector"
          value={tabValue}
          onValueChange={setTabValue}
          items={[
            { value: 'overview', label: 'Overview' },
            { value: 'architecture', label: 'Architecture' },
            { value: 'operations', label: 'Operations' },
          ]}
        >
          <TabsContent value="overview" className="p-3 text-body text-ink-secondary">
            Overview panel content.
          </TabsContent>
          <TabsContent value="architecture" className="p-3 text-body text-ink-secondary">
            Architecture panel content.
          </TabsContent>
          <TabsContent value="operations" className="p-3 text-body text-ink-secondary">
            Operations panel content.
          </TabsContent>
        </Tabs>
      </Section>

      <Section title="Switch">
        <Row label="states">
          <Switch checked={switchOn} onCheckedChange={setSwitchOn} aria-label="Demo switch" />
          <Switch defaultChecked={false} aria-label="Unchecked" />
          <Switch disabled aria-label="Disabled" />
        </Row>
      </Section>

      <Section title="Slider">
        <Row label="linear (zoom)">
          <div className="w-64">
            <Slider
              aria-label="Zoom"
              value={zoom}
              min={0.25}
              max={4}
              step={0.05}
              onValueChange={setZoom}
              formatValue={(v) => `${v.toFixed(2)}×`}
            />
          </div>
        </Row>
        <Row label="log (rps)">
          <div className="w-64">
            <Slider
              aria-label="Requests per second"
              scale="log"
              value={rps}
              min={1}
              max={10000}
              onValueChange={setRps}
              formatValue={(v) => `${Math.round(v)} rps`}
            />
          </div>
        </Row>
      </Section>

      <Section title="Select">
        <Row label="type">
          <Select
            aria-label="Diagram type"
            value={selectValue}
            onValueChange={setSelectValue}
            options={[
              { value: 'hld', label: 'HLD' },
              { value: 'dsa', label: 'DSA' },
              { value: 'lld', label: 'LLD', disabled: true },
            ]}
          />
        </Row>
      </Section>

      <Section title="Input / Textarea">
        <Row label="input">
          <Input placeholder="filter by name, tag…" className="w-64" />
          <Input placeholder="invalid" aria-invalid className="w-40" />
          <Input placeholder="disabled" disabled className="w-40" />
        </Row>
        <Row label="textarea">
          <Textarea placeholder="Narration…" className="w-64" />
        </Row>
      </Section>

      <Section title="Tooltip">
        <Row label="hover">
          <Tooltip content="p99 12ms · err 0.0% · Click to inspect">
            <Button variant="glass" size="sm">Hover me</Button>
          </Tooltip>
        </Row>
        <Row label="avoid (§15.6)">
          <div className="relative flex h-24 w-72 items-center justify-center rounded-card border border-line-hairline">
            <div ref={avoidRef} className="h-10 w-24 rounded-node border border-signal-critical bg-signal-critical/10 text-center text-[11px] leading-10 text-ink-primary">
              selected node
            </div>
            <div className="absolute right-3">
              <Tooltip content="Never covers the node to its left" avoid={avoidRef} side="right">
                <Button variant="glass" size="sm">Hover (avoids node)</Button>
              </Tooltip>
            </div>
          </div>
        </Row>
      </Section>

      <Section title="Popover">
        <Row label="basic">
          <Popover trigger={<Button variant="glass" size="sm">Open popover</Button>}>
            <p className="text-body text-ink-secondary">Collision-aware popover content.</p>
          </Popover>
        </Row>
      </Section>

      <Section title="Dialog / Modal">
        <Row label="trigger">
          <Button variant="glass" size="sm" onClick={() => setDialogOpen(true)}>
            Open dialog
          </Button>
        </Row>
        <Dialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          title="Confirm kill"
          description="This stops the cache node. Requests will fail over to the database."
          footer={
            <>
              <Button variant="ghost" size="sm" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button variant="danger" size="sm" onClick={() => setDialogOpen(false)}>Kill the cache</Button>
            </>
          }
        >
          <p className="text-body text-ink-secondary">Focus is trapped here; Esc or the scrim closes it.</p>
        </Dialog>
      </Section>

      <Section title="Sheet (side)">
        <Row label="trigger">
          <Button variant="glass" size="sm" onClick={() => setSheetOpen(true)}>
            Open side sheet
          </Button>
        </Row>
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen} title="Inspector" side="right">
          <p className="text-body text-ink-secondary">Side sheet content.</p>
        </Sheet>
      </Section>

      <Section title="Drawer / BottomSheet (snap points)">
        <Row label="trigger">
          <Button variant="glass" size="sm" onClick={() => setBottomSheetOpen(true)}>
            Open bottom sheet
          </Button>
        </Row>
        <BottomSheet open={bottomSheetOpen} onOpenChange={setBottomSheetOpen} title="Narration / Inspector">
          <p className="text-body text-ink-secondary">
            Drag the handle, or focus it and use Arrow Up/Down, Home/End to snap between 12/50/92%.
          </p>
        </BottomSheet>
      </Section>

      <Section title="Toast">
        <Row label="trigger">
          <Button variant="glass" size="sm" onClick={() => toast('Fix applied')}>
            Neutral toast
          </Button>
          <Button variant="glass" size="sm" onClick={() => toast({ title: 'Redis is back', variant: 'ok' })}>
            OK toast
          </Button>
          <Button variant="glass" size="sm" onClick={() => toast({ title: 'Cassandra critical', variant: 'critical' })}>
            Critical toast
          </Button>
        </Row>
      </Section>

      <Section title="DropdownMenu / ContextMenu">
        <Row label="dropdown">
          <DropdownMenu
            trigger={<Button variant="glass" size="sm">Actions ▾</Button>}
            onSelect={(v) => toast(`Selected: ${v}`)}
            items={[
              { value: 'inspect', label: 'Inspect', shortcut: <Kbd>I</Kbd> },
              { value: 'kill', label: 'Kill', shortcut: <Kbd>K</Kbd> },
              { type: 'separator' },
              { value: 'delete', label: 'Delete', danger: true },
            ]}
          />
        </Row>
        <Row label="context (right-click)">
          <ContextMenu
            onSelect={(v) => toast(`Selected: ${v}`)}
            items={[
              { value: 'inspect', label: 'Inspect' },
              { value: 'kill', label: 'Kill' },
            ]}
          >
            <div className="grid h-16 w-40 place-items-center rounded-card border border-dashed border-line-strong text-[12px] text-ink-muted">
              right-click me
            </div>
          </ContextMenu>
        </Row>
      </Section>
    </div>
  );
}
