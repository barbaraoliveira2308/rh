export class TeamMemberChangedEvent {
  constructor(
    public readonly teamId: string,
    public readonly employeeId: string,
    public readonly action: 'added' | 'removed',
    public readonly occurredAt: Date = new Date(),
  ) {}
}
