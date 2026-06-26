export interface Department {
  id: string;
  code: string;
  name: string;
  description: string | null;
  providerId: string | null;
  providerName: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
