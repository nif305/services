import { NextRequest, NextResponse } from 'next/server';
import { ReportService } from '@/services/report.service';

export async function GET(request: NextRequest) {
  try {
    const system = request.nextUrl.searchParams.get('system');
    const period = request.nextUrl.searchParams.get('period');
    const data = await ReportService.getExecutiveSummary(system, period);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error?.message || 'تعذر تحميل ملخص التقارير',
      },
      { status: 500 }
    );
  }
}
