import apiClient from './client';
import type { EmployeeContract, UpdateMyContractRequest } from '@/types/contracts';

export async function fetchMyContracts(): Promise<EmployeeContract[]> {
  const response = await apiClient.get<EmployeeContract[]>('/contracts/me');
  return response.data;
}

export async function updateMyContract(
  id: string,
  data: UpdateMyContractRequest,
): Promise<EmployeeContract> {
  const response = await apiClient.patch<EmployeeContract>(`/contracts/me/${id}`, data);
  return response.data;
}
