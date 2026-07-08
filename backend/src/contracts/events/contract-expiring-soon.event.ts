export class ContractExpiringSoonEvent {
  constructor(
    public readonly contractId: string,
    public readonly employeeId: string,
    public readonly endDate: string,
    public readonly daysRemaining: number,
    public readonly occurredAt: Date = new Date(),
  ) {}
}
