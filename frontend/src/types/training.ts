export enum CourseStatus {
  PLANNED = 'planned',
  ONGOING = 'ongoing',
  COMPLETED = 'completed',
}

export enum EnrollmentStatus {
  ENROLLED = 'enrolled',
  STARTED = 'started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  NO_SHOW = 'no_show',
}

export enum ReviewStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  ACKNOWLEDGED = 'acknowledged',
}

export interface Course {
  id: string;
  name: string;
  description: string | null;
  provider: string | null;
  durationHours: number | null;
  isMandatory: boolean;
  category: string | null;
  startDate: string | null;
  endDate: string | null;
  status: CourseStatus;
  prerequisiteCourseId: string | null;
}

export type UpdateCourseRequest = Partial<CreateCourseRequest>;

export interface CourseEnrollment {
  id: string;
  courseId: string;
  employeeId: string;
  status: EnrollmentStatus;
  completionDate: string | null;
  score: number | null;
  certificateUrl: string | null;
}

export interface TrainingRecord {
  id: string;
  employeeId: string;
  courseId: string;
  enrollmentId: string | null;
  completedAt: string;
  score: number | null;
  certificateUrl: string | null;
  course?: Course;
}

export interface EmployeeSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface PerformanceReview {
  id: string;
  employeeId: string;
  reviewerId: string;
  period: string;
  status: ReviewStatus;
  overallRating: number | null;
  potentialRating: number | null;
  strengths: string | null;
  improvementAreas: string | null;
  objectivesNext: string | null;
  createdAt: string;
  employee?: EmployeeSummary;
  reviewer?: EmployeeSummary;
}

export interface Competency {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
}

export interface CompetencyMatrixItem {
  employeeId: string;
  employeeName: string;
  competencyId: string;
  competencyName: string;
  level: number;
}

export interface NineBoxItem {
  employeeId: string;
  employeeName: string;
  performance: number;
  potential: number;
  performanceLevel: 'low' | 'medium' | 'high';
  potentialLevel: 'low' | 'medium' | 'high';
  box: string;
}

export interface CreateCourseRequest {
  name: string;
  description?: string;
  provider?: string;
  durationHours?: number;
  isMandatory?: boolean;
  category?: string;
  startDate?: string;
  endDate?: string;
  status?: CourseStatus;
  prerequisiteCourseId?: string;
}

export interface CreateReviewRequest {
  employeeId: string;
  period: string;
  overallRating?: number;
  potentialRating?: number;
  strengths?: string;
  improvementAreas?: string;
  objectivesNext?: string;
}

export type UpdateReviewRequest = Omit<CreateReviewRequest, 'employeeId' | 'period'>;

export interface CreateCompetencyRequest {
  name: string;
  category?: string;
  description?: string;
}

export interface AssessCompetencyRequest {
  competencyId: string;
  level: number;
  assessedAt?: string;
}
