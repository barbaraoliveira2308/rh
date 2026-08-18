export class WorkflowTaskOverdueEvent {
  constructor(
    public readonly workflowItemId: string,
    public readonly assigneeId: string,
    public readonly occurredAt: Date = new Date(),
  ) {}
}
