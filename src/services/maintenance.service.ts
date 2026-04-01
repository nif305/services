import { MaintenanceStatus, Priority, Role, Status } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export const MaintenanceService = {
  create: async (data: { requesterId: string; itemId?: string; category: string; description: string; priority: Priority; notes?: string; }) => {
    const count = await prisma.maintenanceRequest.count();
    const code = `MNT-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const request = await prisma.maintenanceRequest.create({
      data: { ...data, code, status: MaintenanceStatus.PENDING },
      include: { item: true },
    });

    await prisma.auditLog.create({
      data: {
        userId: data.requesterId,
        action: 'CREATE_MAINTENANCE',
        entity: 'MaintenanceRequest',
        entityId: request.id,
        details: JSON.stringify({ code: request.code }),
      },
    });

    const managers = await prisma.user.findMany({
      where: { roles: { has: Role.MANAGER }, status: Status.ACTIVE },
      select: { id: true },
    });

    if (managers.length) {
      await prisma.notification.createMany({
        data: managers.map((manager) => ({
          userId: manager.id,
          type: 'NEW_MAINTENANCE_REQUEST',
          title: 'طلب صيانة جديد',
          message: `ورد طلب صيانة جديد برقم ${request.code} ويحتاج قرارًا.`,
          link: '/maintenance',
          entityId: request.id,
          entityType: 'MAINTENANCE',
        })),
      });
    }

    return request;
  },

  getAll: async ({ userId, role, page = 1, limit = 10, status }: any) => {
    const skip = (page - 1) * limit;
    const where = { AND: [role === 'USER' ? { requesterId: userId } : {}, status ? { status: status as MaintenanceStatus } : {}] };
    const [requests, total] = await Promise.all([
      prisma.maintenanceRequest.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.maintenanceRequest.count({ where }),
    ]);
    return { data: requests, pagination: { total, page, totalPages: Math.ceil(total / limit) } };
  },

  updateStatus: async (id: string, status: MaintenanceStatus, managerId: string) => {
    const updated = await prisma.maintenanceRequest.update({
      where: { id },
      data: { status, updatedAt: new Date(), notes: `Updated by ${managerId}` },
    });

    await prisma.notification.create({
      data: {
        userId: updated.requesterId,
        type: status === MaintenanceStatus.APPROVED ? 'MAINTENANCE_APPROVED' : 'MAINTENANCE_UPDATED',
        title: status === MaintenanceStatus.APPROVED ? 'تم اعتماد طلب الصيانة' : 'تم تحديث طلب الصيانة',
        message: status === MaintenanceStatus.APPROVED ? `تم اعتماد طلب الصيانة ${updated.code}.` : `تم تحديث حالة طلب الصيانة ${updated.code}.`,
        link: `/notifications`,
        entityId: updated.id,
        entityType: 'MAINTENANCE',
      },
    });

    return updated;
  },
};
