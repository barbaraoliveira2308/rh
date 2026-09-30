export enum EmployeeStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ON_LEAVE = 'on_leave',
}

export interface Employee {
  id: string;
  userId: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  personalEmail: string | null;
  phone: string | null;
  nif: string | null;
  birthDate: string | null;
  address: string | null;
  nationality: string | null;
  gender: string | null;
  photoUrl: string | null;
  departmentId: string | null;
  jobTitleId: string | null;
  managerId: string | null;
  employmentStartDate: string;
  employmentEndDate: string | null;
  status: EmployeeStatus;
  workLocation: string | null;
  iban: string | null;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    email: string;
    username: string;
    isActive: boolean;
  } | null;
  department?: Department | null;
  jobTitle?: JobTitle | null;
  manager?: Employee | null;
}

export interface EmployeeProfileDetails {
  id: string;
  employeeId: string;
  preferredName: string | null;
  pronouns: string | null;
  hideBirthday: boolean;
  idDocumentType: string | null;
  idDocumentNumber: string | null;
  idDocumentExpiry: string | null;
  socialSecurityNumber: string | null;
  retirementRegime: string | null;
  addressLine2: string | null;
  city: string | null;
  postalCode: string | null;
  province: string | null;
  country: string | null;
  disabilityPercentage: number | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  bankAccountFormat: string | null;
  swiftBic: string | null;
  irsPercentage: number | null;
  absenceApproverId: string | null;
  absenceApprover: Pick<Employee, 'id' | 'firstName' | 'lastName'> | null;
}

export type SelfEmployeeProfile = Omit<Employee, 'department' | 'jobTitle' | 'manager' | 'user'> & {
  department: Pick<Department, 'id' | 'name'> | null;
  jobTitle: Pick<JobTitle, 'id' | 'name'> | null;
  manager: Pick<Employee, 'id' | 'firstName' | 'lastName'> | null;
  profileDetails: EmployeeProfileDetails | null;
};

export type UpdateMyProfileRequest = Partial<
  Pick<
    Employee,
    | 'employeeNumber'
    | 'firstName'
    | 'lastName'
    | 'email'
    | 'personalEmail'
    | 'phone'
    | 'nif'
    | 'birthDate'
    | 'address'
    | 'nationality'
    | 'gender'
    | 'photoUrl'
    | 'departmentId'
    | 'jobTitleId'
    | 'managerId'
    | 'employmentStartDate'
    | 'employmentEndDate'
    | 'status'
    | 'workLocation'
    | 'iban'
  >
> &
  Partial<
    Pick<
      EmployeeProfileDetails,
      | 'preferredName'
      | 'pronouns'
      | 'hideBirthday'
      | 'idDocumentType'
      | 'idDocumentNumber'
      | 'idDocumentExpiry'
      | 'socialSecurityNumber'
      | 'retirementRegime'
      | 'addressLine2'
      | 'city'
      | 'postalCode'
      | 'province'
      | 'country'
      | 'disabilityPercentage'
      | 'emergencyContactName'
      | 'emergencyContactPhone'
      | 'bankAccountFormat'
      | 'swiftBic'
      | 'irsPercentage'
      | 'absenceApproverId'
    >
  >;

export interface Department {
  id: string;
  name: string;
  code: string | null;
  parentId: string | null;
  managerId: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface JobTitle {
  id: string;
  name: string;
  level: string | null;
  departmentId: string | null;
  hourlyRate: number | null;
  isActive: boolean;
}

export interface OrgChartNode {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  employeeNumber: string;
  jobTitle: string | null;
  department: string | null;
  status: EmployeeStatus;
  photoUrl: string | null;
  children: OrgChartNode[];
}

export interface EmployeeFilters {
  status?: string;
  departmentId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface EmployeeListResponse {
  data: Employee[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateEmployeeRequest {
  userId?: string;
  employeeNumber?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  personalEmail?: string;
  phone?: string;
  nif?: string;
  birthDate?: string;
  address?: string;
  nationality?: string;
  gender?: string;
  photoUrl?: string;
  departmentId?: string;
  jobTitleId?: string;
  managerId?: string;
  employmentStartDate?: string;
  employmentEndDate?: string;
  status?: EmployeeStatus;
  workLocation?: string;
  iban?: string;
}

export type UpdateEmployeeRequest = Partial<CreateEmployeeRequest>;
