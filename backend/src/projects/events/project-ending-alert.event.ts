export class ProjectEndingAlertEvent {
  constructor(
    public readonly projectId: string,
    public readonly projectName: string,
    public readonly endDate: string,
    public readonly daysRemaining: number,
    public readonly occurredAt: Date = new Date(),
  ) {}
}
