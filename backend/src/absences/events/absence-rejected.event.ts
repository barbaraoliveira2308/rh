export class AbsenceRejectedEvent {
  constructor(
    public readonly absenceId: string,
    public readonly employeeId: string,
    public readonly approverId: string,
    public readonly reason: string,
    public readonly occurredAt: Date = new Date(),
  ) {}
}
