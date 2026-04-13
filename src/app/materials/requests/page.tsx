import { Suspense } from 'react';
import RequestsPage from '@/app/(dashboard)/requests/page';

export default function MaterialsRequestsRoute() {
  return (
    <Suspense fallback={<div className="min-h-[200px]" />}>
      <RequestsPage />
    </Suspense>
  );
}
