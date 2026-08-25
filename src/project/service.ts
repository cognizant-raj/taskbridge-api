import { ProjectRepository } from './repository';
import { AuditService } from '../audit/service';
import { AuditRepository } from '../audit/repository';
import { NotificationService } from '../notification/service';
import { NotificationRepository } from '../notification/repository';
import { ValidationError, NotFoundError, InternalServerError } from '../shared/errors';
import { logInfo, logError } from '../shared/logger';

/**
 * Project Service manages project lifecycle
 * Coordinates with Audit and Notification services
 */
export class ProjectService {
  private auditService: AuditService;
  private notificationService: NotificationService;

  constructor(
    private repository: ProjectRepository,
    auditRepository: AuditRepository,
    notificationRepository: NotificationRepository
  ) {
    this.auditService = new AuditService(auditRepository);
    this.notificationService = new NotificationService(notificationRepository);
  }

  /**
   * Create a new project with audit trail
   * @param data - Project creation data
   * @param actorUserId - User creating the project
   * @returns Created project
   */
  async createProject(
    data: {
      orgId: string;
      name: string;
      description?: string;
    },
    actorUserId: string
  ): Promise<{
    id: string;
    name: string;
    description?: string;
    status: string;
    createdAt: Date;
  }> {
    try {
      // Validate input
      if (!data.name || data.name.trim().length === 0) {
        throw new ValidationError('Project name is required', { field: 'name' });
      }

      if (data.name.length > 255) {
        throw new ValidationError('Project name must be 255 characters or less', { field: 'name' });
      }

      // Create project
      const project = await this.repository.create({
        orgId: data.orgId,
        name: data.name,
        description: data.description,
        createdBy: actorUserId,
      });

      // Record audit entry
      await this.auditService.recordAudit({
        orgId: data.orgId,
        eventType: 'PROJECT_CREATED',
        entityType: 'Project',
        entityId: project.id,
        actorUserId,
        actorOrgId: data.orgId,
        afterState: {
          id: project.id,
          name: project.name,
          description: project.description,
          status: project.status,
        },
        changeDescription: `Project "${project.name}" created`,
      });

      // Notify team
      await this.notificationService.notifyTeamOnProjectChange({
        projectId: project.id,
        orgId: data.orgId,
        eventType: 'PROJECT_CREATED',
        message: `Project "${project.name}" has been created`,
        actorUserId,
        actionUrl: `/projects/${project.id}`,
      });

      logInfo(
        { projectId: project.id, orgId: data.orgId, actorUserId },
        `Project "${project.name}" created successfully`
      );

      return {
        id: project.id,
        name: project.name,
        description: project.description || undefined,
        status: project.status,
        createdAt: project.createdAt,
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }

      logError(
        {
          orgId: data.orgId,
          name: data.name,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to create project'
      );

      throw new InternalServerError('Failed to create project');
    }
  }

  /**
   * Update a project with audit trail
   * @param projectId - Project ID
   * @param orgId - Organization ID
   * @param updates - Updated fields
   * @param actorUserId - User making the update
   * @returns Updated project
   */
  async updateProject(
    projectId: string,
    orgId: string,
    updates: Partial<{
      name: string;
      description: string;
      status: string;
    }>,
    actorUserId: string
  ): Promise<{
    id: string;
    name: string;
    description?: string;
    status: string;
    updatedAt: Date;
  }> {
    try {
      // Get current project state
      const project = await this.repository.findById(projectId, orgId);
      if (!project) {
        throw new NotFoundError(`Project ${projectId} not found`);
      }

      // Validate updates
      if (updates.name !== undefined && updates.name.trim().length === 0) {
        throw new ValidationError('Project name cannot be empty', { field: 'name' });
      }

      // Update project
      const updated = await this.repository.update(projectId, orgId, updates);

      // Record audit entry
      await this.auditService.recordAudit({
        orgId,
        eventType: 'PROJECT_UPDATED',
        entityType: 'Project',
        entityId: projectId,
        actorUserId,
        actorOrgId: orgId,
        beforeState: {
          name: project.name,
          description: project.description,
          status: project.status,
        },
        afterState: {
          name: updated.name,
          description: updated.description,
          status: updated.status,
        },
        changeDescription: `Project updated: ${Object.keys(updates).join(', ')}`,
      });

      // Notify team
      await this.notificationService.notifyTeamOnProjectChange({
        projectId,
        orgId,
        eventType: 'PROJECT_UPDATED',
        message: `Project "${updated.name}" has been updated`,
        actorUserId,
        actionUrl: `/projects/${projectId}`,
      });

      logInfo(
        { projectId, orgId, actorUserId },
        'Project updated successfully'
      );

      return {
        id: updated.id,
        name: updated.name,
        description: updated.description || undefined,
        status: updated.status,
        updatedAt: updated.updatedAt,
      };
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }

      logError(
        {
          projectId,
          orgId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to update project'
      );

      throw new InternalServerError('Failed to update project');
    }
  }

  /**
   * Get a project by ID
   * @param projectId - Project ID
   * @param orgId - Organization ID
   * @returns Project details
   */
  async getProject(
    projectId: string,
    orgId: string
  ): Promise<{
    id: string;
    name: string;
    description?: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }> {
    try {
      const project = await this.repository.findById(projectId, orgId);
      if (!project) {
        throw new NotFoundError(`Project ${projectId} not found`);
      }

      return {
        id: project.id,
        name: project.name,
        description: project.description || undefined,
        status: project.status,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      };
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }

      logError(
        { projectId, orgId, error: error instanceof Error ? error.message : 'Unknown error' },
        'Failed to get project'
      );

      throw new InternalServerError('Failed to get project');
    }
  }

  /**
   * Delete a project (soft delete)
   * @param projectId - Project ID
   * @param orgId - Organization ID
   * @param actorUserId - User deleting the project
   * @returns Deleted project
   */
  async deleteProject(
    projectId: string,
    orgId: string,
    actorUserId: string
  ): Promise<{
    id: string;
    status: string;
  }> {
    try {
      const project = await this.repository.findById(projectId, orgId);
      if (!project) {
        throw new NotFoundError(`Project ${projectId} not found`);
      }

      // Soft delete
      const deleted = await this.repository.softDelete(projectId, orgId);

      // Record audit entry
      await this.auditService.recordAudit({
        orgId,
        eventType: 'PROJECT_DELETED',
        entityType: 'Project',
        entityId: projectId,
        actorUserId,
        actorOrgId: orgId,
        beforeState: {
          id: project.id,
          name: project.name,
          status: project.status,
        },
        afterState: {
          id: deleted.id,
          name: deleted.name,
          status: deleted.status,
        },
        changeDescription: `Project "${project.name}" deleted`,
      });

      logInfo(
        { projectId, orgId, actorUserId },
        'Project deleted successfully'
      );

      return {
        id: deleted.id,
        status: deleted.status,
      };
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }

      logError(
        { projectId, orgId, error: error instanceof Error ? error.message : 'Unknown error' },
        'Failed to delete project'
      );

      throw new InternalServerError('Failed to delete project');
    }
  }
}
