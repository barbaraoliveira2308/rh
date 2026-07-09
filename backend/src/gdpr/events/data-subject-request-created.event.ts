export class DataSubjectRequestCreatedEvent {
  constructor(
    public readonly requestId: string,
    public readonly subjectId: string,
    public readonly requestType: string,
  ) {}
}
