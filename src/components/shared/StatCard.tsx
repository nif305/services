import React from 'react';
import { cn } from '@/lib/utils/cn';

type StatCardProps = {
  title: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  valueClassName?: string;
  onClick?: () => void;
};

export function StatCard({
  title,
  value,
  hint,
  icon,
  className,
  valueClassName,
  onClick,
}: StatCardProps) {
  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      {...(onClick ? { type: 'button' as const, onClick } : {})}
      className={cn(
        'surface-card-strong w-full min-w-0 rounded-[20px] p-4 text-right shadow-soft transition',
        onClick &&
          'cursor-pointer hover:-translate-y-[2px] hover:shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#016564]/10',
        'sm:rounded-[24px] sm:p-5',
        className
      )}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[12px] leading-6 text-slate-500 sm:text-[13px]">{title}</div>
          <div
            className={cn(
              'mt-2 break-words text-[24px] font-extrabold leading-none text-slate-900 sm:mt-3 sm:text-[32px]',
              valueClassName
            )}
          >
            {value}
          </div>

          {hint ? (
            <div className="mt-2 text-[12px] leading-6 text-slate-500 sm:mt-3 sm:text-[13px] sm:leading-7">
              {hint}
            </div>
          ) : null}
        </div>

        {icon ? (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#016564]/8 text-[#016564] sm:h-12 sm:w-12">
            {icon}
          </div>
        ) : null}
      </div>
    </Component>
  );
}