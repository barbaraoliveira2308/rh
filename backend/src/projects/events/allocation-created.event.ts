export class AllocationCreatedEvent {
  constructor(
    public readonly projectId: string,
    public readonly employeeId: string,
    public readonly allocationId: string,
    public readonly occurredAt: Date = new Date(),
  ) {}
}
