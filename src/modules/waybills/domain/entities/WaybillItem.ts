export interface WaybillItemProps {
  id: string;
  waybillId: string;
  productId: string | null;
  productCodeSnapshot: string | null;
  productNameSnapshot: string;
  satBienesTranspCode: string | null;
  satUnitCode: string | null;
  quantity: number;
  weightKg: number | null;
  isHazardousMaterial: boolean;
  hazardousMaterialCode: string | null;
}

export class WaybillItem {
  readonly id!: string;
  readonly waybillId!: string;
  readonly productId!: string | null;
  readonly productCodeSnapshot!: string | null;
  readonly productNameSnapshot!: string;
  readonly satBienesTranspCode!: string | null;
  readonly satUnitCode!: string | null;
  readonly quantity!: number;
  readonly weightKg!: number | null;
  readonly isHazardousMaterial!: boolean;
  readonly hazardousMaterialCode!: string | null;

  private constructor(props: WaybillItemProps) {
    Object.assign(this, props);
  }

  static create(props: WaybillItemProps): WaybillItem {
    return new WaybillItem(props);
  }
}
