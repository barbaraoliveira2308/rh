export class ExpenseSubmittedEvent {
  constructor(
    public readonly reportId: string,
    public readonly employeeId: string,
    public readonly totalAmount: number,
    public readonly occurredAt: Date = new Date(),
  ) {}
}
