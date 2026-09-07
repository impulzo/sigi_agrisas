import { prisma } from "@/shared/infrastructure/prisma/client";
import { PrismaBranchRepository } from "@/modules/branches/infrastructure/repositories/PrismaBranchRepository";
import { PrismaProductRepository } from "@/modules/products/infrastructure/repositories/PrismaProductRepository";
import { PrismaBranchInventoryRepository } from "@/modules/inventory/infrastructure/repositories/PrismaBranchInventoryRepository";
import { PrismaInventoryMovementRepository } from "@/modules/inventory/infrastructure/repositories/PrismaInventoryMovementRepository";
import { PrismaInventoryLotRepository } from "@/modules/inventory/infrastructure/repositories/PrismaInventoryLotRepository";
import { ListBranchInventoryUseCase } from "@/modules/inventory/application/use-cases/ListBranchInventoryUseCase";
import { GetBranchInventoryItemUseCase } from "@/modules/inventory/application/use-cases/GetBranchInventoryItemUseCase";
import { CreateBranchInventoryItemUseCase } from "@/modules/inventory/application/use-cases/CreateBranchInventoryItemUseCase";
import { UpdateBranchInventoryItemUseCase } from "@/modules/inventory/application/use-cases/UpdateBranchInventoryItemUseCase";
import { AdjustStockUseCase } from "@/modules/inventory/application/use-cases/AdjustStockUseCase";
import { DeleteBranchInventoryItemUseCase } from "@/modules/inventory/application/use-cases/DeleteBranchInventoryItemUseCase";
import { GetKardexReportUseCase } from "@/modules/inventory/application/use-cases/GetKardexReportUseCase";
import { RebuildInventoryArticleUseCase } from "@/modules/inventory/application/use-cases/RebuildInventoryArticleUseCase";
import { SendInventoryExpiryNotificationsUseCase } from "@/modules/inventory/application/use-cases/SendInventoryExpiryNotificationsUseCase";
import { BranchInventoryController } from "@/modules/inventory/infrastructure/http/BranchInventoryController";
import { InventoryMovementsController } from "@/modules/inventory/infrastructure/http/InventoryMovementsController";
import { InventoryCronController } from "@/modules/inventory/infrastructure/http/InventoryCronController";
import { PrismaInventoryNotificationSettingsAdapter } from "@/modules/inventory/infrastructure/services/PrismaInventoryNotificationSettingsAdapter";
import { PrismaInventoryNotificationSettingsRepository } from "@/modules/settings/infrastructure/repositories/PrismaInventoryNotificationSettingsRepository";
import { rbacContainer } from "@/modules/rbac/infrastructure/di/container";
import { adminNotificationService } from "@/shared/infrastructure/di/adminNotificationContainer";
import { PrismaTicketSettingsRepository } from "@/modules/settings/infrastructure/repositories/PrismaTicketSettingsRepository";
import { GetTicketSettingsUseCase } from "@/modules/settings/application/use-cases/GetTicketSettingsUseCase";

const branchRepo = new PrismaBranchRepository(prisma);
const productRepo = new PrismaProductRepository(prisma);
const inventoryRepo = new PrismaBranchInventoryRepository(prisma, adminNotificationService);
const movementRepo = new PrismaInventoryMovementRepository(prisma);
const inventoryLotRepo = new PrismaInventoryLotRepository(prisma);
const inventoryNotificationSettingsPort = new PrismaInventoryNotificationSettingsAdapter(
  new PrismaInventoryNotificationSettingsRepository(prisma)
);
const getTicketSettingsUseCase = new GetTicketSettingsUseCase(new PrismaTicketSettingsRepository(prisma));

export const branchInventoryController = new BranchInventoryController(
  new ListBranchInventoryUseCase(inventoryRepo, branchRepo, inventoryLotRepo),
  new GetBranchInventoryItemUseCase(inventoryRepo, inventoryLotRepo),
  new CreateBranchInventoryItemUseCase(inventoryRepo, branchRepo, productRepo),
  new UpdateBranchInventoryItemUseCase(inventoryRepo),
  new AdjustStockUseCase(inventoryRepo),
  new DeleteBranchInventoryItemUseCase(inventoryRepo)
);

export const inventoryMovementsController = new InventoryMovementsController(
  new GetKardexReportUseCase(movementRepo, productRepo),
  new RebuildInventoryArticleUseCase(movementRepo),
  rbacContainer.authorizationService,
  getTicketSettingsUseCase
);

export const inventoryCronController = new InventoryCronController(
  new SendInventoryExpiryNotificationsUseCase(inventoryLotRepo, inventoryNotificationSettingsPort, adminNotificationService)
);
