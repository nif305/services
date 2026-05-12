import {
  ItemStatus,
  ItemType,
  Priority,
  Role,
  Status,
  SuggestionStatus,
} from '@prisma/client';
import { prisma } from '@/lib/prisma';

const PURCHASE_REMINDER_TYPE = 'WAREHOUSE_PURCHASE_REMINDER';
const MAINTENANCE_REMINDER_TYPE = 'WAREHOUSE_MAINTENANCE_REMINDER';
const REQUEST_CREATED_TYPE = 'WAREHOUSE_REQUEST_CREATED';

type JsonObject = Record<string, any>;
type ServiceCategory = 'MAINTENANCE' | 'PURCHASE';

type InventoryReminderItem = {
  id: string;
  code: string;
  name: string;
  type: ItemType;
  status: ItemStatus;
  availableQty: number;
  minStock: number;
  unit: string;
  location: string | null;
  maintenanceIntervalDays: number | null;
  nextMaintenanceDueAt: Date | null;
};

function parseJsonObject(value: unknown): JsonObject {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value as JsonObject;

  try {
    const parsed = JSON.parse(String(value));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function addDays(value: Date, days: number) {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Riyadh',
  }).format(value);
}

function formatIntervalLabel(days: number | null | undefined) {
  if (!days || days <= 0) return 'بحسب الجدولة المعتمدة';
  if (days === 30) return 'كل شهر';
  if (days === 60) return 'كل شهرين';
  return `كل ${days} يوم`;
}

function categoryLabel(category: ServiceCategory) {
  return category === 'MAINTENANCE' ? 'طلب صيانة' : 'طلب شراء مباشر';
}

function categoryRoute(category: ServiceCategory) {
  return category === 'MAINTENANCE' ? '/maintenance' : '/purchases';
}

function buildNotificationTitle(category: ServiceCategory) {
  return `${categoryLabel(category)} جديد`;
}

function normalizeInventoryStatus(item: Pick<InventoryReminderItem, 'availableQty' | 'minStock'>) {
  if (item.availableQty <= 0) return ItemStatus.OUT_OF_STOCK;
  if (item.availableQty <= item.minStock) return ItemStatus.LOW_STOCK;
  return ItemStatus.AVAILABLE;
}

function buildMaintenanceCycleKey(item: Pick<InventoryReminderItem, 'id' | 'nextMaintenanceDueAt'>) {
  if (!item.nextMaintenanceDueAt) return item.id;
  return `${item.id}|${item.nextMaintenanceDueAt.toISOString().slice(0, 10)}`;
}

function parseMaintenanceCycleKey(value: string) {
  const [itemId, dueDate] = String(value || '').split('|');
  return {
    itemId: String(itemId || '').trim(),
    dueDate: String(dueDate || '').trim(),
  };
}

function getWarehouseReminderMeta(justification: string) {
  const data = parseJsonObject(justification);
  const reminder = parseJsonObject(data.warehouseReminder);
  return {
    kind: String(reminder.kind || '').trim(),
    itemId: String(reminder.itemId || '').trim(),
    cycleKey: String(reminder.cycleKey || '').trim(),
  };
}

async function generateSuggestionPublicCode(category: ServiceCategory) {
  const prefix = category === 'MAINTENANCE' ? 'MNT' : 'PRC';
  const year = new Date().getFullYear();
  const rows = await prisma.suggestion.findMany({
    where: { category },
    select: { justification: true },
  });

  let maxSerial = 0;
  for (const row of rows) {
    const parsed = parseJsonObject(row.justification);
    const code = String(parsed.publicCode || '').trim();
    const match = code.match(/-(\d{4})$/);
    if (match) maxSerial = Math.max(maxSerial, Number(match[1]));
  }

  return `${prefix}-${year}-${String(maxSerial + 1).padStart(4, '0')}`;
}

async function notifyManagersAboutSuggestion(params: {
  suggestionId: string;
  category: ServiceCategory;
  requesterName: string;
  code: string;
}) {
  const managers = await prisma.user.findMany({
    where: { status: Status.ACTIVE, roles: { has: Role.MANAGER } },
    select: { id: true },
  });

  if (!managers.length) return;

  await prisma.notification.createMany({
    data: managers.map((manager) => ({
      userId: manager.id,
      type: 'SUGGESTION_PENDING',
      title: buildNotificationTitle(params.category),
      message: `تم رفع ${categoryLabel(params.category)} برقم ${params.code} من ${params.requesterName}`,
      link: categoryRoute(params.category),
      entityId: params.suggestionId,
      entityType: 'suggestion',
    })),
  });
}

async function loadWarehouseUsers() {
  return prisma.user.findMany({
    where: {
      status: Status.ACTIVE,
      roles: { has: Role.WAREHOUSE },
    },
    select: { id: true },
  });
}

async function loadActiveReminderSuggestions() {
  const suggestions = await prisma.suggestion.findMany({
    where: {
      status: {
        in: [SuggestionStatus.PENDING, SuggestionStatus.UNDER_REVIEW, SuggestionStatus.APPROVED],
      },
    },
    select: {
      id: true,
      category: true,
      title: true,
      justification: true,
    },
  });

  const purchaseByItemId = new Map<string, { id: string; code: string }>();
  const maintenanceByCycleKey = new Map<string, { id: string; code: string }>();

  for (const suggestion of suggestions) {
    const reminderMeta = getWarehouseReminderMeta(suggestion.justification);
    const code = String(parseJsonObject(suggestion.justification).publicCode || suggestion.id).trim();

    if (reminderMeta.kind === 'LOW_STOCK' && reminderMeta.itemId) {
      purchaseByItemId.set(reminderMeta.itemId, { id: suggestion.id, code });
    }

    if (reminderMeta.kind === 'MAINTENANCE_DUE' && reminderMeta.cycleKey) {
      maintenanceByCycleKey.set(reminderMeta.cycleKey, { id: suggestion.id, code });
    }
  }

  return { purchaseByItemId, maintenanceByCycleKey };
}

async function markNotificationRead(id: string) {
  return prisma.notification.update({
    where: { id },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
}

async function createWarehouseConfirmationNotification(params: {
  userId: string;
  category: ServiceCategory;
  code: string;
  suggestionId: string;
}) {
  await prisma.notification.create({
    data: {
      userId: params.userId,
      type: REQUEST_CREATED_TYPE,
      title:
        params.category === 'MAINTENANCE'
          ? 'تم تحويل تذكير الصيانة إلى طلب مدير'
          : 'تم تحويل تذكير الشراء إلى طلب مدير',
      message:
        params.category === 'MAINTENANCE'
          ? `تم إنشاء طلب صيانة برقم ${params.code} وإحالته للمدير.`
          : `تم إنشاء طلب شراء مباشر برقم ${params.code} وإحالته للمدير.`,
      link: '/notifications',
      entityId: params.suggestionId,
      entityType: 'suggestion',
    },
  });
}

async function buildSuggestionFromReminder(params: {
  actor: {
    id: string;
    fullName: string | null;
  };
  notificationId: string;
  category: ServiceCategory;
  item: InventoryReminderItem;
  reminderMeta: JsonObject;
  title: string;
  description: string;
  priority: Priority;
  quantity: number;
  requestSource: string;
  serviceItems?: string[];
  nextMaintenanceDueAt?: Date | null;
}) {
  const publicCode = await generateSuggestionPublicCode(params.category);

  const suggestion = await prisma.suggestion.create({
    data: {
      title: params.title,
      description: params.description,
      category: params.category,
      priority: params.priority,
      requesterId: params.actor.id,
      status: SuggestionStatus.PENDING,
      justification: JSON.stringify({
        publicCode,
        itemName: params.item.name,
        quantity: params.quantity,
        location: params.item.location || '',
        requestSource: params.requestSource,
        serviceItems: params.serviceItems || [],
        attachments: [],
        warehouseReminder: {
          ...params.reminderMeta,
          itemId: params.item.id,
          notificationId: params.notificationId,
        },
      }),
    },
    select: {
      id: true,
      justification: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: params.actor.id,
      action: 'CREATE_WAREHOUSE_REMINDER_REQUEST',
      entity: 'Suggestion',
      entityId: suggestion.id,
      details: JSON.stringify({
        category: params.category,
        publicCode,
        itemId: params.item.id,
        itemName: params.item.name,
      }),
    },
  });

  await notifyManagersAboutSuggestion({
    suggestionId: suggestion.id,
    category: params.category,
    requesterName: params.actor.fullName || 'مسؤول المخزن',
    code: publicCode,
  });

  if (params.category === 'MAINTENANCE' && params.nextMaintenanceDueAt) {
    await prisma.inventoryItem.update({
      where: { id: params.item.id },
      data: {
        nextMaintenanceDueAt: params.nextMaintenanceDueAt,
      },
    });
  }

  await markNotificationRead(params.notificationId);
  await createWarehouseConfirmationNotification({
    userId: params.actor.id,
    category: params.category,
    code: publicCode,
    suggestionId: suggestion.id,
  });

  return {
    suggestionId: suggestion.id,
    code: publicCode,
    category: params.category,
    existing: false,
  };
}

export const AlertService = {
  checkLowStock: async () => {
    const warehouseUsers = await loadWarehouseUsers();
    if (!warehouseUsers.length) return [];

    const items = await prisma.inventoryItem.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        status: true,
        availableQty: true,
        minStock: true,
        unit: true,
        location: true,
        maintenanceIntervalDays: true,
        nextMaintenanceDueAt: true,
      },
    });

    const normalizedItems = await Promise.all(
      items.map(async (item) => {
        const nextStatus = normalizeInventoryStatus(item);
        if (item.status !== nextStatus) {
          await prisma.inventoryItem.update({
            where: { id: item.id },
            data: { status: nextStatus },
          });
        }

        return { ...item, status: nextStatus };
      })
    );

    const lowStockItems = normalizedItems.filter(
      (item) => item.availableQty <= item.minStock
    );
    if (!lowStockItems.length) return [];

    const [activeReminders, existingNotifications] = await Promise.all([
      loadActiveReminderSuggestions(),
      prisma.notification.findMany({
        where: {
          userId: { in: warehouseUsers.map((user) => user.id) },
          type: PURCHASE_REMINDER_TYPE,
          entityId: { in: lowStockItems.map((item) => item.id) },
          OR: [
            { isRead: false },
            { createdAt: { gte: addDays(new Date(), -7) } },
          ],
        },
        select: {
          userId: true,
          entityId: true,
        },
      }),
    ]);

    const existingKeys = new Set(
      existingNotifications.map((item) => `${item.userId}:${item.entityId}`)
    );

    const toCreate = warehouseUsers.flatMap((user) =>
      lowStockItems
        .filter((item) => !activeReminders.purchaseByItemId.has(item.id))
        .filter((item) => !existingKeys.has(`${user.id}:${item.id}`))
        .map((item) => ({
          userId: user.id,
          type: PURCHASE_REMINDER_TYPE,
          title:
            item.status === ItemStatus.OUT_OF_STOCK
              ? 'مادة بحاجة إلى شراء عاجل'
              : 'تذكير شراء لمادة منخفضة المخزون',
          message:
            item.status === ItemStatus.OUT_OF_STOCK
              ? `المادة "${item.name}" نفدت تمامًا من المخزون. يمكنك تحويل هذا التذكير إلى طلب شراء للمدير.`
              : `المادة "${item.name}" انخفض رصيدها إلى ${item.availableQty} ${item.unit} والحد الأدنى ${item.minStock}. يمكنك تحويل هذا التذكير إلى طلب شراء للمدير.`,
          link: '/notifications',
          entityId: item.id,
          entityType: 'inventory',
        }))
    );

    if (toCreate.length) {
      await prisma.notification.createMany({ data: toCreate });
    }

    return lowStockItems;
  },

  checkMaintenanceNeeds: async () => {
    const warehouseUsers = await loadWarehouseUsers();
    if (!warehouseUsers.length) return [];

    const dueItems = await prisma.inventoryItem.findMany({
      where: {
        type: ItemType.RETURNABLE,
        maintenanceIntervalDays: { not: null },
        nextMaintenanceDueAt: { lte: new Date() },
      },
      select: {
        id: true,
        code: true,
        name: true,
        status: true,
        availableQty: true,
        minStock: true,
        unit: true,
        location: true,
        maintenanceIntervalDays: true,
        nextMaintenanceDueAt: true,
      },
      orderBy: { nextMaintenanceDueAt: 'asc' },
    });

    if (!dueItems.length) return [];

    const cycleKeys = dueItems.map((item) => buildMaintenanceCycleKey(item));
    const [activeReminders, existingNotifications] = await Promise.all([
      loadActiveReminderSuggestions(),
      prisma.notification.findMany({
        where: {
          userId: { in: warehouseUsers.map((user) => user.id) },
          type: MAINTENANCE_REMINDER_TYPE,
          entityId: { in: cycleKeys },
          OR: [
            { isRead: false },
            { createdAt: { gte: addDays(new Date(), -7) } },
          ],
        },
        select: {
          userId: true,
          entityId: true,
        },
      }),
    ]);

    const existingKeys = new Set(
      existingNotifications.map((item) => `${item.userId}:${item.entityId}`)
    );

    const toCreate = warehouseUsers.flatMap((user) =>
      dueItems
        .filter((item) => !activeReminders.maintenanceByCycleKey.has(buildMaintenanceCycleKey(item)))
        .filter((item) => !existingKeys.has(`${user.id}:${buildMaintenanceCycleKey(item)}`))
        .map((item) => ({
          userId: user.id,
          type: MAINTENANCE_REMINDER_TYPE,
          title: 'موعد صيانة دورية مستحق',
          message: `حان موعد الصيانة الدورية للمادة "${item.name}" والمجدولة ${formatIntervalLabel(item.maintenanceIntervalDays)}. يمكنك تحويل هذا التذكير إلى طلب صيانة للمدير.`,
          link: '/notifications',
          entityId: buildMaintenanceCycleKey(item),
          entityType: 'inventory',
        }))
    );

    if (toCreate.length) {
      await prisma.notification.createMany({ data: toCreate });
    }

    return dueItems;
  },

  syncWarehouseAlerts: async () => {
    const [lowStock, maintenance] = await Promise.all([
      AlertService.checkLowStock(),
      AlertService.checkMaintenanceNeeds(),
    ]);

    return { lowStock, maintenance };
  },

  createManagerRequestFromNotification: async (params: {
    notificationId: string;
    actorId: string;
  }) => {
    const [notification, actor] = await Promise.all([
      prisma.notification.findUnique({
        where: { id: params.notificationId },
      }),
      prisma.user.findUnique({
        where: { id: params.actorId },
        select: {
          id: true,
          fullName: true,
          roles: true,
          status: true,
        },
      }),
    ]);

    if (!notification || notification.userId !== params.actorId) {
      throw new Error('الإشعار غير موجود أو غير مصرح.');
    }

    if (!actor || actor.status !== Status.ACTIVE) {
      throw new Error('الحساب الحالي غير نشط.');
    }

    if (!Array.isArray(actor.roles) || !actor.roles.includes(Role.WAREHOUSE)) {
      throw new Error('هذه العملية متاحة لمسؤول المخزن فقط.');
    }

    if (notification.type === PURCHASE_REMINDER_TYPE) {
      const item = await prisma.inventoryItem.findUnique({
        where: { id: String(notification.entityId || '').trim() },
        select: {
          id: true,
          code: true,
          name: true,
          type: true,
          status: true,
          availableQty: true,
          minStock: true,
          unit: true,
          location: true,
          maintenanceIntervalDays: true,
          nextMaintenanceDueAt: true,
        },
      });

      if (!item) {
        throw new Error('المادة المرتبطة بهذا التذكير غير موجودة.');
      }

      const activeReminders = await loadActiveReminderSuggestions();
      const existing = activeReminders.purchaseByItemId.get(item.id);
      if (existing) {
        await markNotificationRead(notification.id);
        return {
          suggestionId: existing.id,
          code: existing.code,
          category: 'PURCHASE' as const,
          existing: true,
        };
      }

      const shortageQty = Math.max(item.minStock - item.availableQty, 1);
      return buildSuggestionFromReminder({
        actor,
        notificationId: notification.id,
        category: 'PURCHASE',
        item,
        reminderMeta: {
          kind: 'LOW_STOCK',
        },
        title: `طلب شراء لتعويض نقص ${item.name}`,
        description:
          item.status === ItemStatus.OUT_OF_STOCK
            ? `المادة "${item.name}" نفدت تمامًا من المخزون، ويقترح مسؤول المخزن تأمين كمية عاجلة لا تقل عن ${shortageQty} ${item.unit}.`
            : `المادة "${item.name}" انخفض رصيدها الحالي إلى ${item.availableQty} ${item.unit} بينما الحد الأدنى المحدد ${item.minStock}، ويقترح مسؤول المخزن شراء كمية لا تقل عن ${shortageQty} ${item.unit}.`,
        priority:
          item.status === ItemStatus.OUT_OF_STOCK ? Priority.URGENT : Priority.NORMAL,
        quantity: shortageQty,
        requestSource: 'تذكير تلقائي من مسؤول المخزن لشراء مادة ناقصة',
      });
    }

    if (notification.type === MAINTENANCE_REMINDER_TYPE) {
      const { itemId } = parseMaintenanceCycleKey(String(notification.entityId || ''));
      const item = await prisma.inventoryItem.findUnique({
        where: { id: itemId },
        select: {
          id: true,
          code: true,
          name: true,
          type: true,
          status: true,
          availableQty: true,
          minStock: true,
          unit: true,
          location: true,
          maintenanceIntervalDays: true,
          nextMaintenanceDueAt: true,
        },
      });

      if (!item || !item.maintenanceIntervalDays || !item.nextMaintenanceDueAt) {
        throw new Error('بيانات الصيانة الدورية لهذه المادة غير مكتملة.');
      }

      const cycleKey = buildMaintenanceCycleKey(item);
      const activeReminders = await loadActiveReminderSuggestions();
      const existing = activeReminders.maintenanceByCycleKey.get(cycleKey);
      if (existing) {
        await markNotificationRead(notification.id);
        return {
          suggestionId: existing.id,
          code: existing.code,
          category: 'MAINTENANCE' as const,
          existing: true,
        };
      }

      let nextDueAt = item.nextMaintenanceDueAt;
      while (nextDueAt.getTime() <= Date.now()) {
        nextDueAt = addDays(nextDueAt, item.maintenanceIntervalDays);
      }

      return buildSuggestionFromReminder({
        actor,
        notificationId: notification.id,
        category: 'MAINTENANCE',
        item,
        reminderMeta: {
          kind: 'MAINTENANCE_DUE',
          cycleKey,
          dueAt: item.nextMaintenanceDueAt.toISOString(),
          intervalDays: item.maintenanceIntervalDays,
        },
        title: `طلب صيانة دورية للمادة ${item.name}`,
        description: `حان موعد الصيانة الدورية للمادة "${item.name}" المجدولة ${formatIntervalLabel(item.maintenanceIntervalDays)}، وآخر موعد تنبيه كان ${formatDate(item.nextMaintenanceDueAt)}. يرجى اعتماد طلب الصيانة للمحافظة على جاهزية المادة.`,
        priority: Priority.NORMAL,
        quantity: 1,
        requestSource: 'تذكير دوري من مسؤول المخزن لصيانة مادة مرتجعة',
        serviceItems: [item.name],
        nextMaintenanceDueAt: nextDueAt,
      });
    }

    throw new Error('هذا الإشعار لا يدعم التحويل إلى طلب مدير.');
  },
};
