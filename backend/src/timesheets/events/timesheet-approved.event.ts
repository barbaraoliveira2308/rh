export class TimesheetApprovedEvent {
  constructor(
    public readonly periodId: string,
    public readonly approverId: string,
    public readonly occurredAt: Date = new Date(),
  ) {}
}
