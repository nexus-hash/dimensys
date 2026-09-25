'use client';

import dynamic from 'next/dynamic';
import React from 'react';

interface BlueprintClientWrapperProps {
  slug: string;
}

export default function BlueprintClientWrapper({ slug }: BlueprintClientWrapperProps) {
  // Use React.useMemo so we don't recreate the dynamic component on every render of the same slug
  const BlueprintComponent = React.useMemo(() => {
    return dynamic(() => import(`../../solutions/${slug}/BlueprintView`), {
      ssr: false,
      loading: () => (
        <div className="flex items-center justify-center min-h-[600px] rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-dashed border-gray-300 dark:border-white/10">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
            <span className="text-gray-500 dark:text-gray-400 text-sm">Loading 2D Blueprint...</span>
          </div>
        </div>
      ),
    });
  }, [slug]);

  return <BlueprintComponent />;
}
