ALTER TABLE "inventory_items"
ADD COLUMN "maintenanceIntervalDays" INTEGER,
ADD COLUMN "nextMaintenanceDueAt" TIMESTAMP(3);

CREATE INDEX "inventory_items_nextMaintenanceDueAt_idx"
ON "inventory_items"("nextMaintenanceDueAt");
