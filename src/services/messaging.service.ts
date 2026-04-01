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

  getInbox: async (userId: string) => {
    const rows = await prisma.internalMessage.findMany({
      where: { receiverId: userId },
      include: { sender: { select: userSelect }, receiver: { select: userSelect } },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(mapMessage);
  },

  getSent: async (userId: string) => {
    const rows = await prisma.internalMessage.findMany({
      where: { senderId: userId },
      include: { sender: { select: userSelect }, receiver: { select: userSelect } },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(mapMessage);
  },

  markAsRead: async (messageId: string, userId: string) =>
    prisma.internalMessage.updateMany({
      where: { id: messageId, receiverId: userId },
      data: { isRead: true, readAt: new Date() },
    }),
};
