import { Suspense } from 'react';
import { ServiceRequestTypePage } from '@/components/services/ServiceRequestTypePage';

export default function MaintenancePage() {
  return (
    <Suspense fallback={null}>
      <ServiceRequestTypePage type="MAINTENANCE" />
    </Suspense>
  );
}
