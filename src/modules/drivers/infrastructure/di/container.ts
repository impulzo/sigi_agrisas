import { prisma } from "@/shared/infrastructure/prisma/client";
import { PrismaDriverRepository } from "@/modules/drivers/infrastructure/repositories/PrismaDriverRepository";
import { ListDriversUseCase } from "@/modules/drivers/application/use-cases/ListDriversUseCase";
import { GetDriverUseCase } from "@/modules/drivers/application/use-cases/GetDriverUseCase";
import { CreateDriverUseCase } from "@/modules/drivers/application/use-cases/CreateDriverUseCase";
import { UpdateDriverUseCase } from "@/modules/drivers/application/use-cases/UpdateDriverUseCase";
import { DriversController } from "@/modules/drivers/infrastructure/http/DriversController";

const driverRepo = new PrismaDriverRepository(prisma);

const listDriversUseCase = new ListDriversUseCase(driverRepo);
const getDriverUseCase = new GetDriverUseCase(driverRepo);
const createDriverUseCase = new CreateDriverUseCase(driverRepo);
const updateDriverUseCase = new UpdateDriverUseCase(driverRepo);

export const driversController = new DriversController(
  listDriversUseCase,
  getDriverUseCase,
  createDriverUseCase,
  updateDriverUseCase
);
