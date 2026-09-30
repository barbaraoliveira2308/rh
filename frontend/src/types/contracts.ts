export interface EmployeeContract {
  id: string;
  employeeId: string;
  contractType: 'permanent' | 'fixed_term' | 'freelancer' | 'b2b';
  status: 'draft' | 'active' | 'expired' | 'terminated';
  startDate: string;
  endDate: string | null;
  value: number | null;
  monthlyCost: number | null;
  currency: string;
  contractingEntity: string;
  legalEntityId: string | null;
  legalEntity?: { id: string; name: string } | null;
  documentUrl: string | null;
}

export type UpdateMyContractRequest = Partial<
  Pick<
    EmployeeContract,
    | 'contractType'
    | 'status'
    | 'startDate'
    | 'endDate'
    | 'value'
    | 'monthlyCost'
    | 'currency'
    | 'contractingEntity'
  >
>;
