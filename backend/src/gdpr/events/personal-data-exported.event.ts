export class PersonalDataExportedEvent {
  constructor(
    public readonly subjectId: string,
    public readonly requestId: string,
    public readonly requestType: string,
  ) {}
}
