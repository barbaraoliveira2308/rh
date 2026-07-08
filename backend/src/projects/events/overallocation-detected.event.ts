export class OverallocationDetectedEvent {
  constructor(
    public readonly employeeId: string,
    public readonly projectId: string,
    public readonly totalPercentage: number,
    public readonly occurredAt: Date = new Date(),
  ) {}
}
