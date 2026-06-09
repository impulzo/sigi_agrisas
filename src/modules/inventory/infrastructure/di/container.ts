import { prisma } from "@/shared/infrastructure/prisma/client";
import { PrismaBranchRepository } from "@/modules/branches/infrastructure/repositories/PrismaBranchRepository";
import { PrismaProductRepository } from "@/modules/products/infrastructure/repositories/PrismaProductRepository";
import { PrismaBranchInventoryRepository } from "@/modules/inventory/infrastructure/repositories/PrismaBranchInventoryRepository";
import { ListBranchInventoryUseCase } from "@/modules/inventory/application/use-cases/ListBranchInventoryUseCase";
import { GetBranchInventoryItemUseCase } from "@/modules/inventory/application/use-cases/GetBranchInventoryItemUseCase";
import { CreateBranchInventoryItemUseCase } from "@/modules/inventory/application/use-cases/CreateBranchInventoryItemUseCase";
import { UpdateBranchInventoryItemUseCase } from "@/modules/inventory/application/use-cases/UpdateBranchInventoryItemUseCase";
import { AdjustStockUseCase } from "@/modules/inventory/application/use-cases/AdjustStockUseCase";
import { DeleteBranchInventoryItemUseCase } from "@/modules/inventory/application/use-cases/DeleteBranchInventoryItemUseCase";
import { BranchInventoryController } from "@/modules/inventory/infrastructure/http/BranchInventoryController";

const branchRepo = new PrismaBranchRepository(prisma);
const productRepo = new PrismaProductRepository(prisma);
const inventoryRepo = new PrismaBranchInventoryRepository(prisma);

export const branchInventoryController = new BranchInventoryController(
  new ListBranchInventoryUseCase(inventoryRepo, branchRepo),
  new GetBranchInventoryItemUseCase(inventoryRepo),
  new CreateBranchInventoryItemUseCase(inventoryRepo, branchRepo, productRepo),
  new UpdateBranchInventoryItemUseCase(inventoryRepo),
  new AdjustStockUseCase(inventoryRepo),
  new DeleteBranchInventoryItemUseCase(inventoryRepo)
);
