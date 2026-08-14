export interface CalendarEvent {
  id: string;
  type: string;
  title: string;
  date: string;
  endDate?: string | null;
  color?: string | null;
  metadata?: Record<string, unknown>;
}

export interface PublicHoliday {
  id: string;
  countryCode: string;
  holidayDate: string;
  name: string;
  localName: string | null;
  global: boolean;
  region: string | null;
  type: string | null;
}

export enum CompanyEventType {
  BRIDGE351 = 'bridge351',
  NIVVOS = 'nivvos',
  COMPANY = 'company',
  OTHER = 'other',
}

export interface CompanyEvent {
  id: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  type: CompanyEventType;
  color: string | null;
  isRecurring: boolean;
  createdBy: string;
}

export enum BlockedPeriodScope {
  ABSENCES = 'absences',
  TIMESHEETS = 'timesheets',
  ALL = 'all',
}

export interface BlockedPeriod {
  id: string;
  reason: string;
  startDate: string;
  endDate: string;
  scope: BlockedPeriodScope;
  createdBy: string;
}

export interface CreatePublicHolidayRequest {
  countryCode: string;
  holidayDate: string;
  name: string;
  localName?: string;
  global?: boolean;
  region?: string;
  type?: string;
}

export interface CreateCompanyEventRequest {
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  type?: CompanyEventType;
  color?: string;
  isRecurring?: boolean;
}

export interface CreateBlockedPeriodRequest {
  reason: string;
  startDate: string;
  endDate: string;
  scope?: BlockedPeriodScope;
}
