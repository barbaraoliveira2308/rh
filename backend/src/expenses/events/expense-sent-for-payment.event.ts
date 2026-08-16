export class ExpenseSentForPaymentEvent {
  constructor(
    public readonly reportId: string,
    public readonly employeeId: string,
    public readonly occurredAt: Date = new Date(),
  ) {}
}
