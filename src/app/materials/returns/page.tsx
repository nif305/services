import { Suspense } from 'react';
import ReturnsPage from '@/app/(dashboard)/returns/page';

export default function MaterialsReturnsRoute() {
  return (
    <Suspense fallback={<div className="min-h-[200px]" />}>
      <ReturnsPage />
    </Suspense>
  );
}
