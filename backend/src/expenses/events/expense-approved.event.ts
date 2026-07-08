export class ExpenseApprovedEvent {
  constructor(
    public readonly reportId: string,
    public readonly employeeId: string,
    public readonly approverId: string,
    public readonly occurredAt: Date = new Date(),
  ) {}
}
