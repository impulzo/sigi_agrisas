export interface FolioDto {
  id: string;
  code: string;
  name: string;
  prefix: string | null;
  currentNumber: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ListFoliosResponse {
  items: FolioDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateFolioBody {
  code: string;
  name: string;
  prefix?: string | null;
  currentNumber?: number;
  isActive?: boolean;
}

export interface UpdateFolioBody {
  name?: string;
  prefix?: string | null;
  currentNumber?: number;
  isActive?: boolean;
}
