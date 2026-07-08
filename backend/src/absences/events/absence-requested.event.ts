export class AbsenceRequestedEvent {
  constructor(
    public readonly absenceId: string,
    public readonly employeeId: string,
    public readonly absenceTypeId: string,
    public readonly occurredAt: Date = new Date(),
  ) {}
}
