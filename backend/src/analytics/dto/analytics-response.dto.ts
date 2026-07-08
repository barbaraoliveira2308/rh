export interface TeamOccupancyDto {
  employeeId: string;
  employeeName: string;
  allocationPercentage: number;
}

export interface ProjectAllocationMapDto {
  projectId: string;
  projectName: string;
  totalAllocationPercentage: number;
}

export interface UnallocatedEmployeeDto {
  employeeId: string;
  employeeName: string;
}

export interface CapacityForecastDto {
  month: string;
  totalCapacity: number;
  allocatedCapacity: number;
  availableCapacity: number;
}

export interface ConsultantMarginDto {
  employeeId: string;
  employeeName: string;
  period: string;
  hourlyRate: number | null;
  hourlyCost: number | null;
  hoursWorked: number;
  margin: number | null;
}

export interface ProjectProfitabilityDto {
  projectId: string;
  projectName: string;
  revenue: number;
  cost: number;
  margin: number;
}

export interface MonthlyRevenueDto {
  month: string;
  projectId: string;
  projectName: string;
  clientId: string;
  revenue: number;
}

export interface TopPerformingProjectDto {
  projectId: string;
  projectName: string;
  margin: number;
  revenue: number;
  cost: number;
}
