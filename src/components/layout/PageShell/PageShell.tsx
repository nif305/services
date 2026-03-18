import React from 'react';
import { cn } from '@/lib/utils/cn';

export function PageShell({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('min-w-0 space-y-4 sm:space-y-6', className)}>
      {children}
    </div>
  );
}