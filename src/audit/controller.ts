import { Router, Response } from 'express';
import { AuditService } from './service';
import { AuditRepository } from './repository';
import { AuthenticatedRequest, authenticateInternalService, authenticateJWT } from '../shared/middleware';
import { createAuditSchema, auditQuerySchema } from '../shared/validation';
import { ValidationError, NotFoundError } from '../shared/errors';
import { logInfo } from '../shared/logger';

const router = Router();
const auditRepository = new AuditRepository();
const auditService = new AuditService(auditRepository);

/**
 * POST /audit
 * Internal endpoint to record an audit entry
 * Authentication: Service-to-service (internal)
 */
router.post('/audit', authenticateInternalService, async (req, res, next) => {
  try {
    const { error, value } = createAuditSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.message, { details: error.details });
    }

    const result = await auditService.recordAudit(value);

    logInfo(
      { auditId: result.id, orgId: result.orgId },
      'Audit entry created via POST /audit'
    );

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /audit/:projectId
 * Query audit history for a project
 * Authentication: JWT (user must belong to org)
 */
router.get('/audit/:projectId', authenticateJWT, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { projectId } = req.params;
    const { error, value } = auditQuerySchema.validate(req.query);
    if (error) {
      throw new ValidationError(error.message);
    }

    if (!req.orgId || !req.userId) {
      throw new NotFoundError('User or organization context missing');
    }

    const filters = {
      eventType: value.eventType,
      from: value.from ? new Date(value.from) : undefined,
      to: value.to ? new Date(value.to) : undefined,
    };

    const result = await auditService.queryHistory(
      projectId,
      req.orgId,
      filters,
      value.limit,
      value.offset
    );

    logInfo(
      { projectId, orgId: req.orgId, resultCount: result.data.length },
      'Audit history retrieved'
    );

    res.json({
      data: result.data,
      pagination: {
        total: result.total,
        limit: value.limit,
        offset: value.offset,
        hasMore: value.offset + value.limit < result.total,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
