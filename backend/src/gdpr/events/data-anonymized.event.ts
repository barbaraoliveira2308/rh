export class DataAnonymizedEvent {
  constructor(
    public readonly employeeId: string,
    public readonly triggeredBy: 'request' | 'retention' | 'admin',
  ) {}
}
