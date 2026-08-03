import { prisma } from "@/shared/infrastructure/prisma/client";
import { PrismaBranchRepository } from "@/modules/branches/infrastructure/repositories/PrismaBranchRepository";
import { PrismaProductRepository } from "@/modules/products/infrastructure/repositories/PrismaProductRepository";
import { PrismaBranchInventoryRepository } from "@/modules/inventory/infrastructure/repositories/PrismaBranchInventoryRepository";
import { PrismaInventoryMovementRepository } from "@/modules/inventory/infrastructure/repositories/PrismaInventoryMovementRepository";
import { ListBranchInventoryUseCase } from "@/modules/inventory/application/use-cases/ListBranchInventoryUseCase";
import { GetBranchInventoryItemUseCase } from "@/modules/inventory/application/use-cases/GetBranchInventoryItemUseCase";
import { CreateBranchInventoryItemUseCase } from "@/modules/inventory/application/use-cases/CreateBranchInventoryItemUseCase";
import { UpdateBranchInventoryItemUseCase } from "@/modules/inventory/application/use-cases/UpdateBranchInventoryItemUseCase";
import { AdjustStockUseCase } from "@/modules/inventory/application/use-cases/AdjustStockUseCase";
import { DeleteBranchInventoryItemUseCase } from "@/modules/inventory/application/use-cases/DeleteBranchInventoryItemUseCase";
import { GetKardexReportUseCase } from "@/modules/inventory/application/use-cases/GetKardexReportUseCase";
import { RebuildInventoryArticleUseCase } from "@/modules/inventory/application/use-cases/RebuildInventoryArticleUseCase";
import { BranchInventoryController } from "@/modules/inventory/infrastructure/http/BranchInventoryController";
import { InventoryMovementsController } from "@/modules/inventory/infrastructure/http/InventoryMovementsController";
import { rbacContainer } from "@/modules/rbac/infrastructure/di/container";
import { adminNotificationService } from "@/shared/infrastructure/di/adminNotificationContainer";

const branchRepo = new PrismaBranchRepository(prisma);
const productRepo = new PrismaProductRepository(prisma);
const inventoryRepo = new PrismaBranchInventoryRepository(prisma, adminNotificationService);
const movementRepo = new PrismaInventoryMovementRepository(prisma);

export const branchInventoryController = new BranchInventoryController(
  new ListBranchInventoryUseCase(inventoryRepo, branchRepo),
  new GetBranchInventoryItemUseCase(inventoryRepo),
  new CreateBranchInventoryItemUseCase(inventoryRepo, branchRepo, productRepo),
  new UpdateBranchInventoryItemUseCase(inventoryRepo),
  new AdjustStockUseCase(inventoryRepo),
  new DeleteBranchInventoryItemUseCase(inventoryRepo)
);

export const inventoryMovementsController = new InventoryMovementsController(
  new GetKardexReportUseCase(movementRepo, productRepo),
  new RebuildInventoryArticleUseCase(movementRepo),
  rbacContainer.authorizationService
);
