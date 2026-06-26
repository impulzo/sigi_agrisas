import { FolioScope } from "@/shared/domain/types/FolioScope";

export interface FolioProps {
  code: string;
  name: string;
  prefix: string | null;
  scope: FolioScope;
  currentNumber: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class Folio {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly prefix: string | null;
  readonly scope: FolioScope;
  readonly currentNumber: number;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(id: string, props: FolioProps) {
    this.id = id;
    this.code = props.code;
    this.name = props.name;
    this.prefix = props.prefix;
    this.scope = props.scope;
    this.currentNumber = props.currentNumber;
    this.isActive = props.isActive;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(id: string, props: FolioProps): Folio {
    return new Folio(id, props);
  }
}
