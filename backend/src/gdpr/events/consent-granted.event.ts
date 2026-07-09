export class ConsentGrantedEvent {
  constructor(
    public readonly consentId: string,
    public readonly subjectId: string,
    public readonly purpose: string,
  ) {}
}
