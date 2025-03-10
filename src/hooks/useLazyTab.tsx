
import React, { Suspense, lazy } from 'react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export function useLazyTab(importCallback: () => Promise<{ default: React.ComponentType<any> }>) {
  const LazyComponent = lazy(importCallback);

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    }>
      <LazyComponent />
    </Suspense>
  );
}
