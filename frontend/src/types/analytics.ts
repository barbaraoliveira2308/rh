export interface ConsultantMargin {
  employeeId: string;
  employeeName: string;
  period: string;
  hourlyRate: number | null;
  hourlyCost: number | null;
  hoursWorked: number;
  margin: number | null;
}

export interface ProjectProfitability {
  projectId: string;
  projectName: string;
  revenue: number;
  cost: number;
  margin: number;
}

export interface MonthlyRevenue {
  month: string;
  projectId: string;
  projectName: string;
  clientId: string;
  revenue: number;
}

export interface TopPerformingProject {
  projectId: string;
  projectName: string;
  margin: number;
  revenue: number;
  cost: number;
}

export interface TeamOccupancy {
  employeeId: string;
  employeeName: string;
  allocationPercentage: number;
}

export interface CapacityForecast {
  month: string;
  totalCapacity: number;
  allocatedCapacity: number;
  availableCapacity: number;
}
