import { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "../prisma/client";

type TxClient = PrismaClient | Prisma.TransactionClient;

const SINGLETON_ID = "emitter-fiscal-settings-singleton";

export interface EmitterFiscalData {
  rfc: string;
  legalName: string;
  fiscalRegime: string;
  zipCode: string;
}

export type PartialEmitterFiscalData = Partial<EmitterFiscalData>;

export async function getEmitterFiscalSettings(tx: TxClient = prisma): Promise<PartialEmitterFiscalData | null> {
  const row = await tx.emitterFiscalSettings.findUnique({ where: { id: SINGLETON_ID } });
  if (!row) return null;
  return {
    rfc: row.rfc ?? undefined,
    legalName: row.legalName ?? undefined,
    fiscalRegime: row.fiscalRegime ?? undefined,
    zipCode: row.zipCode ?? undefined,
  };
}

export async function upsertEmitterFiscalSettings(
  data: PartialEmitterFiscalData,
  tx: TxClient = prisma
): Promise<void> {
  await tx.emitterFiscalSettings.upsert({
    where: { id: SINGLETON_ID },
    create: {
      id: SINGLETON_ID,
      rfc: data.rfc ?? null,
      legalName: data.legalName ?? null,
      fiscalRegime: data.fiscalRegime ?? null,
      zipCode: data.zipCode ?? null,
    },
    update: {
      ...(data.rfc !== undefined ? { rfc: data.rfc } : {}),
      ...(data.legalName !== undefined ? { legalName: data.legalName } : {}),
      ...(data.fiscalRegime !== undefined ? { fiscalRegime: data.fiscalRegime } : {}),
      ...(data.zipCode !== undefined ? { zipCode: data.zipCode } : {}),
    },
  });
}

export function isEmitterFiscalDataComplete(
  data: PartialEmitterFiscalData | null
): data is EmitterFiscalData {
  return !!data && !!data.rfc && !!data.legalName && !!data.fiscalRegime && !!data.zipCode;
}
