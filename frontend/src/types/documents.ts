export type DocumentCategory =
  | 'contract'
  | 'id'
  | 'training'
  | 'absence'
  | 'declarations'
  | 'presence'
  | 'medical_leave'
  | 'insurance'
  | 'onboarding'
  | 'equipment';

export interface ProfileDocument {
  id: string;
  name: string;
  category: DocumentCategory;
  fileType: string;
  sizeBytes: number;
  ownerId: string | null;
  courseId: string | null;
  isPublic: boolean;
  createdAt: string;
}
