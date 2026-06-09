export interface Folio {
  id: string;
  code: string;
  name: string;
  prefix: string | null;
  currentNumber: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
