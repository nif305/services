import { prisma } from '@/lib/prisma';

function getPrimaryRole(roles?: string[] | null) {
  const normalized = Array.isArray(roles) ? roles.map((r) => String(r).toLowerCase()) : [];
  if (normalized.includes('manager')) return 'manager';
  if (normalized.includes('warehouse')) return 'warehouse';
  return 'user';
}

const userSelect = {
  id: true,
  fullName: true,
  roles: true,
  email: true,
} as const;

function mapMessage<T extends { sender?: any; receiver?: any }>(message: T) {
  return {
    ...message,
    sender: message.sender ? { ...message.sender, role: getPrimaryRole(message.sender.roles) } : message.sender,
    receiver: message.receiver ? { ...message.receiver, role: getPrimaryRole(message.receiver.roles) } : message.receiver,
  };
}

export const MessagingService = {
  send: async (data: {
    senderId: string;
    receiverId: string;
    subject: string;
    body: string;
    relatedType?: string;
    relatedId?: string;
  }) => {
    const message = await prisma.internalMessage.create({
      data: {
        senderId: data.senderId,
        receiverId: data.receiverId,
        subject: data.subject,
        body: data.body,
        relatedType: data.relatedType || null,
        relatedId: data.relatedId || null,
      },
      include: {
        sender: { select: userSelect },
        receiver: { select: userSelect },
      },
    });

    await prisma.notification.create({
      data: {
        userId: data.receiverId,
        type: 'NEW_MESSAGE',
        title: 'رسالة داخلية جديدة',
        message: `وردتك رسالة داخلية جديدة بعنوان: ${data.subject}`,
        link: `/messages?open=${message.id}`,
        entityId: message.id,
        entityType: 'message',
      },
    });

    return mapMessage(message);
  },

  getBox: async ({
    userId,
    box,
    page = 1,
    limit = 20,
    search,
    openId,
  }: {
    userId: string;
    box: 'inbox' | 'sent';
    page?: number;
    limit?: number;
    search?: string | null;
    openId?: string | null;
  }) => {
    const safePage = Number.isFinite(page) ? Math.max(1, Math.trunc(page)) : 1;
    const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(1, Math.trunc(limit)), 50) : 20;
    const normalizedSearch = String(search || '').trim();
    const isInbox = box !== 'sent';
    const identityFilter = isInbox ? { receiverId: userId } : { senderId: userId };
    const searchFilter = normalizedSearch
      ? {
          OR: [
            { subject: { contains: normalizedSearch, mode: 'insensitive' as const } },
            { body: { contains: normalizedSearch, mode: 'insensitive' as const } },
            { relatedId: { contains: normalizedSearch, mode: 'insensitive' as const } },
            { relatedType: { contains: normalizedSearch, mode: 'insensitive' as const } },
            isInbox
              ? {
                  sender: {
                    is: {
                      fullName: { contains: normalizedSearch, mode: 'insensitive' as const },
                    },
                  },
                }
              : {
                  receiver: {
                    is: {
                      fullName: { contains: normalizedSearch, mode: 'insensitive' as const },
                    },
                  },
                },
          ],
        }
      : {};

    const where = {
      AND: [identityFilter, searchFilter],
    };

    const [rows, total, unread, focusMessage] = await Promise.all([
      prisma.internalMessage.findMany({
        where,
        include: { sender: { select: userSelect }, receiver: { select: userSelect } },
        orderBy: { createdAt: 'desc' },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
      }),
      prisma.internalMessage.count({ where }),
      isInbox
        ? prisma.internalMessage.count({
            where: {
              receiverId: userId,
              isRead: false,
            },
          })
        : Promise.resolve(0),
      openId
        ? prisma.internalMessage.findFirst({
            where: {
              id: openId,
              ...(isInbox ? { receiverId: userId } : { senderId: userId }),
            },
            include: { sender: { select: userSelect }, receiver: { select: userSelect } },
          })
        : Promise.resolve(null),
    ]);

    return {
      data: rows.map(mapMessage),
      stats: {
        total,
        unread,
      },
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.max(1, Math.ceil(total / safeLimit)),
      },
      focusMessage: focusMessage ? mapMessage(focusMessage) : null,
    };
  },

  markAsRead: async (messageId: string, userId: string) =>
    prisma.internalMessage.updateMany({
      where: { id: messageId, receiverId: userId },
      data: { isRead: true, readAt: new Date() },
    }),
};
