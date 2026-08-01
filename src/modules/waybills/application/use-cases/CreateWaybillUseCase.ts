import { randomUUID } from "crypto";
import { WaybillRepository, CreateWaybillData, CreateWaybillItemData } from "../ports/WaybillRepository";
import { WaybillFacturamaGateway, StampTrasladoInput } from "../ports/WaybillFacturamaGateway";
import { WaybillLookupService, BranchForWaybill } from "../ports/WaybillLookupService";
import {
  InvalidBranchPairError,
  BranchAddressIncompleteError,
  ProductRequiredForSimpleTransferError,
  ProductNotFoundForTransferError,
  CanonicalFolioMissingError,
} from "../../domain/errors";
import { Waybill, WaybillAddressSnapshot } from "../../domain/entities/Waybill";
import { CreateWaybillRequest, CreateSimpleWaybillRequest, CreateCartaPorteWaybillRequest } from "../dto/WaybillDto";

const TS_FOLIO_CODE = "TS";
const TRI_FOLIO_CODE = "TRI";

const REQUIRED_ADDRESS_FIELDS: Array<{ key: keyof BranchForWaybill; label: string }> = [
  { key: "addressStreet", label: "addressStreet" },
  { key: "addressExteriorNumber", label: "addressExteriorNumber" },
  { key: "addressNeighborhood", label: "addressNeighborhood" },
  { key: "addressMunicipality", label: "addressMunicipality" },
  { key: "addressState", label: "addressState" },
  { key: "addressCountry", label: "addressCountry" },
  { key: "addressZipCode", label: "addressZipCode" },
];

function toAddressSnapshot(branch: BranchForWaybill): WaybillAddressSnapshot {
  return {
    street: branch.addressStreet!,
    exteriorNumber: branch.addressExteriorNumber!,
    interiorNumber: branch.addressInteriorNumber,
    neighborhood: branch.addressNeighborhood!,
    municipality: branch.addressMunicipality!,
    state: branch.addressState!,
    country: branch.addressCountry!,
    zipCode: branch.addressZipCode!,
  };
}

function validateAddressComplete(branch: BranchForWaybill): void {
  const missing = REQUIRED_ADDRESS_FIELDS.filter((f) => !branch[f.key]).map((f) => f.label);
  if (missing.length > 0) throw new BranchAddressIncompleteError(branch.id, missing);
}

export class CreateWaybillUseCase {
  constructor(
    private readonly waybillRepo: WaybillRepository,
    private readonly gateway: WaybillFacturamaGateway,
    private readonly lookupService: WaybillLookupService
  ) {}

  async execute(input: CreateWaybillRequest, creatorId: string): Promise<Waybill> {
    const { origin, destination } = await this.resolveBranchPair(input.originBranchId, input.destinationBranchId);

    return input.type === "simple"
      ? this.executeSimple(input, origin, destination, creatorId)
      : this.executeCartaPorte(input, origin, destination, creatorId);
  }

  private async resolveBranchPair(
    originBranchId: string,
    destinationBranchId: string
  ): Promise<{ origin: BranchForWaybill; destination: BranchForWaybill }> {
    if (originBranchId === destinationBranchId) {
      throw new InvalidBranchPairError("origin and destination must be different branches");
    }

    const [origin, destination] = await Promise.all([
      this.lookupService.findBranch(originBranchId),
      this.lookupService.findBranch(destinationBranchId),
    ]);
    if (!origin || !origin.isActive) {
      throw new InvalidBranchPairError(`origin branch ${originBranchId} not found or inactive`);
    }
    if (!destination || !destination.isActive) {
      throw new InvalidBranchPairError(`destination branch ${destinationBranchId} not found or inactive`);
    }

    return { origin, destination };
  }

  private async executeSimple(
    input: CreateSimpleWaybillRequest,
    origin: BranchForWaybill,
    destination: BranchForWaybill,
    creatorId: string
  ): Promise<Waybill> {
    const folio = await this.lookupService.findFolioByCode(TRI_FOLIO_CODE);
    if (!folio || !folio.isActive) {
      throw new CanonicalFolioMissingError(TRI_FOLIO_CODE);
    }

    const items: CreateWaybillItemData[] = await Promise.all(
      input.items.map(async (item, index) => {
        if (!item.productId) {
          throw new ProductRequiredForSimpleTransferError(index);
        }
        const product = await this.lookupService.findProduct(item.productId);
        if (!product || !product.isActive) {
          throw new ProductNotFoundForTransferError(item.productId);
        }
        return {
          id: randomUUID(),
          productId: item.productId,
          productCodeSnapshot: product.code,
          productNameSnapshot: product.name,
          satBienesTranspCode: null,
          satUnitCode: null,
          quantity: item.quantity,
          weightKg: null,
          isHazardousMaterial: false,
          hazardousMaterialCode: null,
        };
      })
    );

    const data: CreateWaybillData = {
      type: "simple",
      id: randomUUID(),
      folioId: folio.id,
      originBranchId: origin.id,
      destinationBranchId: destination.id,
      departureAt: new Date(input.transferDate),
      notes: input.notes ?? null,
      creatorId,
      items,
    };

    return this.waybillRepo.createCompleted(data, null);
  }

  private async executeCartaPorte(
    input: CreateCartaPorteWaybillRequest,
    origin: BranchForWaybill,
    destination: BranchForWaybill,
    creatorId: string
  ): Promise<Waybill> {
    validateAddressComplete(origin);
    validateAddressComplete(destination);

    const folio = await this.lookupService.findFolioByCode(TS_FOLIO_CODE);
    if (!folio || !folio.isActive) {
      throw new CanonicalFolioMissingError(TS_FOLIO_CODE);
    }

    const items: CreateWaybillItemData[] = await Promise.all(
      input.items.map(async (item) => {
        let productCodeSnapshot: string | null = null;
        let productNameSnapshot = item.description;
        if (item.productId) {
          const product = await this.lookupService.findProduct(item.productId);
          if (product) {
            productCodeSnapshot = product.code;
            productNameSnapshot = product.name;
          }
        }
        return {
          id: randomUUID(),
          productId: item.productId ?? null,
          productCodeSnapshot,
          productNameSnapshot,
          satBienesTranspCode: item.satBienesTranspCode,
          satUnitCode: item.satUnitCode,
          quantity: item.quantity,
          weightKg: item.weightKg,
          isHazardousMaterial: item.isHazardousMaterial ?? false,
          hazardousMaterialCode: item.hazardousMaterialCode ?? null,
        };
      })
    );

    const originAddress = toAddressSnapshot(origin);
    const destinationAddress = toAddressSnapshot(destination);

    const data: CreateWaybillData = {
      type: "carta_porte",
      id: randomUUID(),
      folioId: folio.id,
      originBranchId: origin.id,
      destinationBranchId: destination.id,
      originAddress,
      destinationAddress,
      vehiclePlate: input.vehicle.plate,
      vehicleConfig: input.vehicle.config,
      vehiclePermitType: input.vehicle.permitType,
      vehiclePermitNumber: input.vehicle.permitNumber,
      insuranceCompany: input.vehicle.insuranceCompany,
      insurancePolicy: input.vehicle.insurancePolicy,
      driverName: input.driver.name,
      driverRfc: input.driver.rfc ?? null,
      driverLicenseNumber: input.driver.licenseNumber,
      distanceKm: input.distanceKm,
      departureAt: new Date(input.departureAt),
      arrivalAt: new Date(input.arrivalAt),
      notes: null,
      creatorId,
      items,
    };

    const stampPayload: StampTrasladoInput = {
      origin: originAddress,
      destination: destinationAddress,
      merchandise: items.map((item) => ({
        description: item.productNameSnapshot,
        satBienesTranspCode: item.satBienesTranspCode!,
        satUnitCode: item.satUnitCode!,
        quantity: item.quantity,
        weightKg: item.weightKg!,
        isHazardousMaterial: item.isHazardousMaterial,
        hazardousMaterialCode: item.hazardousMaterialCode,
      })),
      autotransporte: {
        plate: input.vehicle.plate,
        config: input.vehicle.config,
        permitType: input.vehicle.permitType,
        permitNumber: input.vehicle.permitNumber,
        insuranceCompany: input.vehicle.insuranceCompany,
        insurancePolicy: input.vehicle.insurancePolicy,
      },
      figuraTransporte: {
        name: input.driver.name,
        rfc: input.driver.rfc ?? null,
        licenseNumber: input.driver.licenseNumber,
      },
      distanceKm: input.distanceKm,
    };

    return this.waybillRepo.createCompleted(data, async () => {
      const result = await this.gateway.stampTraslado(stampPayload);
      return {
        cfdiId: result.cfdiId,
        uuid: result.uuid,
        xmlUrl: result.xmlUrl ?? null,
        pdfUrl: result.pdfUrl ?? null,
      };
    });
  }
}
