export class SecurityIncidentEscalatedEvent {
  constructor(
    public readonly incidentId: string,
    public readonly severity: string,
  ) {}
}
