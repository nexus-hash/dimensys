import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TabsContent } from '@/app/(components)/ui';
import { InspectorTabs } from '../InspectorTabs';

describe('InspectorTabs', () => {
  it('starts on the first item and switches on click, without a controlling parent', async () => {
    const user = userEvent.setup();
    render(
      <InspectorTabs
        items={[
          { value: 'overview', label: 'Overview' },
          { value: 'operations', label: 'Operations' },
        ]}
        ariaLabel="Detail tabs"
      >
        <TabsContent value="overview">Overview content</TabsContent>
        <TabsContent value="operations">Operations content</TabsContent>
      </InspectorTabs>,
    );
    expect(screen.getByText('Overview content')).toBeVisible();
    await user.click(screen.getByRole('tab', { name: 'Operations' }));
    expect(screen.getByText('Operations content')).toBeVisible();
  });
});
