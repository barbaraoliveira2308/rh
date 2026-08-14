export interface SystemSetting {
  id: string;
  companyName: string;
  defaultCountry: string;
  defaultCurrency: string;
  defaultVacationDaysPerYear: number;
  carryOverVacationDays: number;
  timesheetSubmissionDeadlineDay: number;
  defaultDailyHours: number;
  contractExpiryAlertDays: number;
  projectEndAlertDays: number;
  underallocationThresholdPercentage: number;
  sessionTimeoutMinutes: number;
  maxLoginAttempts: number;
  lockoutPeriodMinutes: number;
  mfaRequiredForAdmin: boolean;
  gdprPostExitRetentionYears: number;
  documentsTrashRetentionDays: number;
  updatedAt: string;
}

export type UpdateSystemSettingsRequest = Partial<Omit<SystemSetting, 'id' | 'updatedAt'>>;

export interface LegalEntity {
  id: string;
  name: string;
  nif: string | null;
  country: string;
  currency: string;
  calendarProfileCountryCode: string;
  vacationDaysPerYearOverride: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLegalEntityRequest {
  name: string;
  nif?: string;
  country: string;
  currency: string;
  calendarProfileCountryCode: string;
  vacationDaysPerYearOverride?: number;
  isActive?: boolean;
}

export type UpdateLegalEntityRequest = Partial<CreateLegalEntityRequest>;
