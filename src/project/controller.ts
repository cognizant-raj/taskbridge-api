import { Router, Response } from 'express';
import { ProjectService } from './service';
import { ProjectRepository } from './repository';
import { AuditRepository } from '../audit/repository';
import { NotificationRepository } from '../notification/repository';
import { AuthenticatedRequest, authenticateJWT } from '../shared/middleware';
import { ValidationError, NotFoundError } from '../shared/errors';
import { logInfo } from '../shared/logger';

const router = Router();
const projectRepository = new ProjectRepository();
const auditRepository = new AuditRepository();
const notificationRepository = new NotificationRepository();
const projectService = new ProjectService(
  projectRepository,
  auditRepository,
  notificationRepository
);

/**
 * POST /projects
 * Create a new project
 * Authentication: JWT (user must belong to org)
 */
router.post('/projects', authenticateJWT, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { name, description } = req.body;

    if (!req.orgId || !req.userId) {
      throw new NotFoundError('User or organization context missing');
    }

    const project = await projectService.createProject(
      {
        orgId: req.orgId,
        name,
        description,
      },
      req.userId
    );

    logInfo({ projectId: project.id, orgId: req.orgId }, 'Project created via POST');

    res.status(201).json(project);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /projects/:projectId
 * Get project details
 * Authentication: JWT (user must belong to org)
 */
router.get('/projects/:projectId', authenticateJWT, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { projectId } = req.params;

    if (!req.orgId) {
      throw new NotFoundError('Organization context missing');
    }

    const project = await projectService.getProject(projectId, req.orgId);

    logInfo({ projectId, orgId: req.orgId }, 'Project retrieved via GET');

    res.json(project);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /projects/:projectId
 * Update a project
 * Authentication: JWT (user must belong to org)
 */
router.patch('/projects/:projectId', authenticateJWT, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { projectId } = req.params;
    const { name, description, status } = req.body;

    if (!req.orgId || !req.userId) {
      throw new NotFoundError('User or organization context missing');
    }

    const project = await projectService.updateProject(
      projectId,
      req.orgId,
      { name, description, status },
      req.userId
    );

    logInfo({ projectId, orgId: req.orgId }, 'Project updated via PATCH');

    res.json(project);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /projects/:projectId
 * Delete a project (soft delete)
 * Authentication: JWT (user must belong to org)
 */
router.delete('/projects/:projectId', authenticateJWT, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { projectId } = req.params;

    if (!req.orgId || !req.userId) {
      throw new NotFoundError('User or organization context missing');
    }

    const result = await projectService.deleteProject(projectId, req.orgId, req.userId);

    logInfo({ projectId, orgId: req.orgId }, 'Project deleted via DELETE');

    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
