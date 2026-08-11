import {
  DepartmentPriceListRepository,
  RawPriceListRow,
} from "../../application/ports/DepartmentPriceListRepository";
import { DepartmentPriceListFilters } from "../../domain/value-objects/DepartmentPriceListFilters";

export class InMemoryDepartmentPriceListRepository implements DepartmentPriceListRepository {
  constructor(private readonly rows: RawPriceListRow[]) {}

  async findRows(filters: DepartmentPriceListFilters): Promise<RawPriceListRow[]> {
    return this.rows.filter((row) => {
      if (filters.departmentId && row.departmentId !== filters.departmentId) return false;
      return true;
    });
  }
}
