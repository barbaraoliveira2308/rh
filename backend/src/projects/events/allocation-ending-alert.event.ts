export class AllocationEndingAlertEvent {
  constructor(
    public readonly projectId: string,
    public readonly allocationId: string,
    public readonly employeeId: string,
    public readonly endDate: string,
    public readonly daysRemaining: number,
    public readonly occurredAt: Date = new Date(),
  ) {}
}
