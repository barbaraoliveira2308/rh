export class SecurityIncidentRegisteredEvent {
  constructor(
    public readonly incidentId: string,
    public readonly severity: string,
  ) {}
}
