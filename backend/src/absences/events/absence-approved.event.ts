export class AbsenceApprovedEvent {
  constructor(
    public readonly absenceId: string,
    public readonly employeeId: string,
    public readonly approverId: string,
    public readonly occurredAt: Date = new Date(),
  ) {}
}
