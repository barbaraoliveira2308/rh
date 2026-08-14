import apiClient from './client';
import type {
  Course,
  CourseEnrollment,
  TrainingRecord,
  PerformanceReview,
  Competency,
  CompetencyMatrixItem,
  NineBoxItem,
  CreateCourseRequest,
  CreateReviewRequest,
  UpdateReviewRequest,
  CreateCompetencyRequest,
  AssessCompetencyRequest,
} from '@/types/training';

export async function fetchCourses(): Promise<Course[]> {
  const response = await apiClient.get<Course[]>('/training/courses');
  return response.data;
}

export async function createCourse(data: CreateCourseRequest): Promise<Course> {
  const response = await apiClient.post<Course>('/training/courses', data);
  return response.data;
}

export async function enrollInCourse(
  courseId: string,
  employeeId: string,
): Promise<CourseEnrollment> {
  const response = await apiClient.post<CourseEnrollment>(`/training/courses/${courseId}/enroll`, {
    employeeId,
  });
  return response.data;
}

export async function completeEnrollment(
  enrollmentId: string,
  data: { score?: number; certificateUrl?: string },
): Promise<CourseEnrollment> {
  const response = await apiClient.post<CourseEnrollment>(
    `/training/enrollments/${enrollmentId}/complete`,
    data,
  );
  return response.data;
}

export async function fetchTrainingRecords(employeeId: string): Promise<TrainingRecord[]> {
  const response = await apiClient.get<TrainingRecord[]>(`/training/records/${employeeId}`);
  return response.data;
}

export async function fetchReviews(filters?: {
  employeeId?: string;
  teamId?: string;
}): Promise<PerformanceReview[]> {
  const response = await apiClient.get<PerformanceReview[]>('/training/reviews', {
    params: filters,
  });
  return response.data;
}

export async function createReview(data: CreateReviewRequest): Promise<PerformanceReview> {
  const response = await apiClient.post<PerformanceReview>('/training/reviews', data);
  return response.data;
}

export async function updateReview(
  id: string,
  data: UpdateReviewRequest,
): Promise<PerformanceReview> {
  const response = await apiClient.patch<PerformanceReview>(`/training/reviews/${id}`, data);
  return response.data;
}

export async function submitReview(id: string): Promise<PerformanceReview> {
  const response = await apiClient.post<PerformanceReview>(`/training/reviews/${id}/submit`);
  return response.data;
}

export async function fetchNineBox(teamId: string, reviewCycle: string): Promise<NineBoxItem[]> {
  const response = await apiClient.get<NineBoxItem[]>('/training/nine-box', {
    params: { teamId, reviewCycle },
  });
  return response.data;
}

export async function fetchCompetencies(): Promise<Competency[]> {
  const response = await apiClient.get<Competency[]>('/training/competencies');
  return response.data;
}

export async function createCompetency(data: CreateCompetencyRequest): Promise<Competency> {
  const response = await apiClient.post<Competency>('/training/competencies', data);
  return response.data;
}

export async function fetchCompetencyMatrix(teamId: string): Promise<CompetencyMatrixItem[]> {
  const response = await apiClient.get<CompetencyMatrixItem[]>('/training/competencies/matrix', {
    params: { teamId },
  });
  return response.data;
}

export async function assessCompetency(
  employeeId: string,
  data: AssessCompetencyRequest,
): Promise<void> {
  await apiClient.post(`/training/competencies/${employeeId}/assess`, data);
}
