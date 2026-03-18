'use client';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function PendingApprovalPage() {
  const { logout } = useAuth();
  const router = useRouter();

  return (
    <div
      dir="rtl"
      className="flex min-h-screen items-center justify-center overflow-x-hidden bg-surface px-4 py-6 sm:px-5 sm:py-8"
    >
      <Card className="w-full max-w-xl rounded-[24px] p-5 text-center shadow-soft sm:rounded-[28px] sm:p-8">
        <h1 className="text-[24px] leading-[1.3] text-primary sm:text-[30px]">
          طلبك قيد المراجعة
        </h1>

        <p className="mt-4 text-[14px] leading-7 text-surface-subtle sm:text-[15px] sm:leading-8">
          تم استلام طلب إنشاء الحساب بنجاح، وسيتم إشعارك بعد اعتماده من الإدارة المختصة.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:justify-center">
          <Button
            onClick={logout}
            className="w-full sm:min-w-[160px] sm:w-auto"
          >
            تسجيل الخروج
          </Button>

          <Button
            variant="ghost"
            onClick={() => router.push('/login')}
            className="w-full sm:min-w-[160px] sm:w-auto"
          >
            العودة لتسجيل الدخول
          </Button>
        </div>
      </Card>
    </div>
  );
}