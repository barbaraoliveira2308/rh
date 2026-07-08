export class AbsenceCancelledEvent {
  constructor(
    public readonly absenceId: string,
    public readonly employeeId: string,
    public readonly occurredAt: Date = new Date(),
  ) {}
}
