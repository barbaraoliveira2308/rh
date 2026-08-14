export enum LegalBasis {
  CONSENT = 'consent',
  CONTRACT = 'contract',
  LEGAL_OBLIGATION = 'legal_obligation',
  VITAL_INTEREST = 'vital_interest',
  PUBLIC_INTEREST = 'public_interest',
  LEGITIMATE_INTEREST = 'legitimate_interest',
}

export enum DataSubjectRequestType {
  ACCESS = 'access',
  RECTIFICATION = 'rectification',
  ERASURE = 'erasure',
  RESTRICTION = 'restriction',
  PORTABILITY = 'portability',
  OBJECTION = 'objection',
}

export enum DataSubjectRequestStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  REJECTED = 'rejected',
}

export enum SecurityIncidentSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum SecurityIncidentStatus {
  OPEN = 'open',
  INVESTIGATING = 'investigating',
  RESOLVED = 'resolved',
}

export enum RetentionAction {
  DELETE = 'delete',
  ANONYMIZE = 'anonymize',
}

export const LEGAL_BASIS_LABELS: Record<LegalBasis, string> = {
  [LegalBasis.CONSENT]: 'Consentimento',
  [LegalBasis.CONTRACT]: 'Execução de contrato',
  [LegalBasis.LEGAL_OBLIGATION]: 'Obrigação legal',
  [LegalBasis.VITAL_INTEREST]: 'Interesse vital',
  [LegalBasis.PUBLIC_INTEREST]: 'Interesse público',
  [LegalBasis.LEGITIMATE_INTEREST]: 'Interesse legítimo',
};

export const REQUEST_TYPE_LABELS: Record<DataSubjectRequestType, string> = {
  [DataSubjectRequestType.ACCESS]: 'Acesso aos dados',
  [DataSubjectRequestType.RECTIFICATION]: 'Retificação',
  [DataSubjectRequestType.ERASURE]: 'Apagamento',
  [DataSubjectRequestType.RESTRICTION]: 'Limitação do tratamento',
  [DataSubjectRequestType.PORTABILITY]: 'Portabilidade',
  [DataSubjectRequestType.OBJECTION]: 'Oposição',
};

export interface ConsentRecord {
  id: string;
  subjectId: string;
  purpose: string;
  legalBasis: LegalBasis;
  version: string | null;
  grantedAt: string | null;
  revokedAt: string | null;
  isActive: boolean;
  ipAddress: string | null;
  collectedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DataSubjectRequestSubject {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface DataSubjectRequest {
  id: string;
  subjectId: string;
  requestType: DataSubjectRequestType;
  status: DataSubjectRequestStatus;
  requestedAt: string;
  deadline: string | null;
  completedAt: string | null;
  responseNotes: string | null;
  responsePayload: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  subject?: DataSubjectRequestSubject;
}

export interface RetentionPolicy {
  id: string;
  dataCategory: string;
  retentionYears: number;
  legalReference: string | null;
  actionAfterRetention: RetentionAction;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SecurityIncident {
  id: string;
  title: string;
  description: string | null;
  severity: SecurityIncidentSeverity;
  detectedAt: string;
  reportedToAuthorityAt: string | null;
  affectedSubjects: number | null;
  status: SecurityIncidentStatus;
  resolutionNotes: string | null;
  reportedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ComplianceReport {
  generatedAt: string;
  activeConsents: number;
  pendingRequests: number;
  overdueRequests: number;
  openIncidents: number;
  criticalIncidentsPendingAuthority: number;
  activeRetentionPolicies: number;
}

export interface RecordConsentPayload {
  subjectId: string;
  purpose: string;
  legalBasis: LegalBasis;
  version?: string;
  collectedBy?: string;
}

export interface RevokeConsentPayload {
  subjectId: string;
  purpose: string;
}

export interface CreateDataRequestPayload {
  subjectId: string;
  requestType: DataSubjectRequestType;
  notes?: string;
}

export interface CreateRetentionPolicyPayload {
  dataCategory: string;
  retentionYears: number;
  legalReference?: string;
  actionAfterRetention: RetentionAction;
  isActive?: boolean;
}

export interface ReportIncidentPayload {
  title: string;
  description?: string;
  severity: SecurityIncidentSeverity;
  affectedSubjects?: number;
}

export interface UpdateIncidentPayload {
  status?: SecurityIncidentStatus;
  resolutionNotes?: string;
  reportedToAuthorityAt?: string;
}
