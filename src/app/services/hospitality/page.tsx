import { Suspense } from 'react';
import { ServiceRequestTypePage } from '@/components/services/ServiceRequestTypePage';

export default function HospitalityRequestsPage() {
  return (
    <Suspense fallback={null}>
      <ServiceRequestTypePage type="HOSPITALITY" />
    </Suspense>
  );
}
