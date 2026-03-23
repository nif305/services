import { PrismaClient, PurchaseStatus, Role, Status } from '@prisma/client';
const prisma = new PrismaClient();

export const PurchaseService = {
  create: async (data: { requesterId: string; items: string; reason: string; budgetNote?: string; estimatedValue?: number; }) => {
    const count = await prisma.purchaseRequest.count();
    const code = `PUR-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const request = await prisma.purchaseRequest.create({
      data: { ...data, code, status: PurchaseStatus.PENDING },
    });

    const managers = await prisma.user.findMany({
      where: { role: Role.MANAGER, status: Status.ACTIVE },
      select: { id: true },
    });

    if (managers.length) {
      await prisma.notification.createMany({
        data: managers.map((manager) => ({
          userId: manager.id,
          type: 'NEW_PURCHASE_REQUEST',
          title: 'طلب شراء مباشر جديد',
          message: `ورد طلب شراء مباشر برقم ${request.code} ويحتاج اعتمادًا.`,
          link: '/purchases',
          entityId: request.id,
          entityType: 'PURCHASE',
        })),
      });
    }

    return request;
  },

  getAll: async ({ userId, role, page = 1, limit = 10, status }: any) => {
    const skip = (page - 1) * limit;
    const where = { AND: [role === 'USER' ? { requesterId: userId } : {}, status ? { status: status as PurchaseStatus } : {}] };
    const [requests, total] = await Promise.all([
      prisma.purchaseRequest.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.purchaseRequest.count({ where }),
    ]);
    return { data: requests, pagination: { total, page, totalPages: Math.ceil(total / limit) } };
  },

  updateStatus: async (id: string, status: PurchaseStatus) => {
    const updated = await prisma.purchaseRequest.update({
      where: { id },
      data: { status },
    });

    await prisma.notification.create({
      data: {
        userId: updated.requesterId,
        type: status === PurchaseStatus.APPROVED ? 'PURCHASE_APPROVED' : 'PURCHASE_UPDATED',
        title: status === PurchaseStatus.APPROVED ? 'تم اعتماد طلب الشراء' : 'تم تحديث طلب الشراء',
        message:
          status === PurchaseStatus.APPROVED
            ? `تم اعتماد طلب الشراء ${updated.code}.`
            : `تم تحديث حالة طلب الشراء ${updated.code}.`,
        link: `/notifications`,
        entityId: updated.id,
        entityType: 'PURCHASE',
      },
    });

    return updated;
  },
};
