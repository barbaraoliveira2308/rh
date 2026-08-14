export interface CapacityOverviewEntry {
  employeeId: string;
  employeeName: string;
  allocationPercentage: number;
  absenceDays: number;
  adjustedAllocationPercentage: number;
}

export interface CapacityAvailableEmployee {
  employeeId: string;
  employeeName: string;
}

export interface CapacityAlerts {
  overallocations: CapacityOverviewEntry[];
  underallocations: CapacityOverviewEntry[];
  available: CapacityAvailableEmployee[];
}

export enum AllocationType {
  PERCENTAGE = 'percentage',
  HOURS = 'hours',
}

export interface CapacityCalendarEntry {
  employeeId: string;
  employeeName: string;
  projectId: string;
  projectName: string;
  startDate: string;
  endDate: string | null;
  allocationType: AllocationType;
  allocationValue: number;
}

export interface Team {
  id: string;
  name: string;
}
