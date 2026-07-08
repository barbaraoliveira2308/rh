export class TimesheetSubmittedEvent {
  constructor(
    public readonly periodId: string,
    public readonly employeeId: string,
    public readonly occurredAt: Date = new Date(),
  ) {}
}
