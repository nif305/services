import { Suspense } from 'react';
import MessagesPage from '@/app/(dashboard)/messages/page';

export default function ServicesMessagesRoute() {
  return (
    <Suspense fallback={<div className="min-h-[200px]" />}>
      <MessagesPage />
    </Suspense>
  );
}
