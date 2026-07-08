export class TimesheetRejectedEvent {
  constructor(
    public readonly periodId: string,
    public readonly approverId: string,
    public readonly reason: string,
    public readonly occurredAt: Date = new Date(),
  ) {}
}
