import { Department } from "@/modules/departments/domain/entities/Department";

export interface DepartmentDto {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function toDepartmentDto(d: Department): DepartmentDto {
  return {
    id: d.id,
    code: d.code,
    name: d.name,
    description: d.description,
    isActive: d.isActive,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}
