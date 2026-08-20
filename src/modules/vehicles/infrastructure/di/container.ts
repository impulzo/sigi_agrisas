import { prisma } from "@/shared/infrastructure/prisma/client";
import { PrismaVehicleRepository } from "@/modules/vehicles/infrastructure/repositories/PrismaVehicleRepository";
import { ListVehiclesUseCase } from "@/modules/vehicles/application/use-cases/ListVehiclesUseCase";
import { GetVehicleUseCase } from "@/modules/vehicles/application/use-cases/GetVehicleUseCase";
import { CreateVehicleUseCase } from "@/modules/vehicles/application/use-cases/CreateVehicleUseCase";
import { UpdateVehicleUseCase } from "@/modules/vehicles/application/use-cases/UpdateVehicleUseCase";
import { VehiclesController } from "@/modules/vehicles/infrastructure/http/VehiclesController";

const vehicleRepo = new PrismaVehicleRepository(prisma);

const listVehiclesUseCase = new ListVehiclesUseCase(vehicleRepo);
const getVehicleUseCase = new GetVehicleUseCase(vehicleRepo);
const createVehicleUseCase = new CreateVehicleUseCase(vehicleRepo);
const updateVehicleUseCase = new UpdateVehicleUseCase(vehicleRepo);

export const vehiclesController = new VehiclesController(
  listVehiclesUseCase,
  getVehicleUseCase,
  createVehicleUseCase,
  updateVehicleUseCase
);
