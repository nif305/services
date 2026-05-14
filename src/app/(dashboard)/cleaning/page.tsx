import { Suspense } from 'react';
import { ServiceRequestTypePage } from '@/components/services/ServiceRequestTypePage';

export default function CleaningPage() {
  return (
    <Suspense fallback={null}>
      <ServiceRequestTypePage type="CLEANING" />
    </Suspense>
  );
}
