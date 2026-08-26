export type ProjectStatus = 'active' | 'archived' | 'deleted';

export interface ProjectModel {
  id: string;
  orgId: string;
  teamId?: string | null;
  name: string;
  description?: string | null;
  status: ProjectStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
