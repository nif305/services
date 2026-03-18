import React from 'react';
import { cn } from '@/lib/utils/cn';

export function Table({
  className,
  ...props
}: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="mobile-scroll-x w-full max-w-full">
      <table
        className={cn('w-full min-w-[720px] text-right', className)}
        {...props}
      />
    </div>
  );
}