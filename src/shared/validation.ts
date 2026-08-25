import Joi from 'joi';

/**
 * Joi schema for creating an audit entry
 */
export const createAuditSchema = Joi.object({
  orgId: Joi.string().required(),
  eventType: Joi.string().valid(
    'PROJECT_CREATED',
    'PROJECT_UPDATED',
    'PROJECT_DELETED',
    'PROJECT_STATUS_CHANGED',
    'MILESTONE_REOPENED'
  ).required(),
  entityType: Joi.string().required(),
  entityId: Joi.string().required(),
  actorUserId: Joi.string().required(),
  actorOrgId: Joi.string().required(),
  actorEmail: Joi.string().email().optional(),
  actorIpAddress: Joi.string().optional(),
  beforeState: Joi.object().optional(),
  afterState: Joi.object().required(),
  changeDescription: Joi.string().optional(),
});

/**
 * Joi schema for creating a notification
 */
export const createNotificationSchema = Joi.object({
  projectId: Joi.string().required(),
  orgId: Joi.string().required(),
  eventType: Joi.string().required(),
  message: Joi.string().max(500).required(),
  actionUrl: Joi.string().optional(),
  recipientUserId: Joi.string().required(),
});

/**
 * Joi schema for query parameters on audit history endpoint
 */
export const auditQuerySchema = Joi.object({
  from: Joi.date().iso().optional(),
  to: Joi.date().iso().optional(),
  eventType: Joi.string().optional(),
  limit: Joi.number().min(1).max(200).default(50),
  offset: Joi.number().min(0).default(0),
});

/**
 * Joi schema for query parameters on notifications endpoint
 */
export const notificationQuerySchema = Joi.object({
  isRead: Joi.boolean().optional(),
  limit: Joi.number().min(1).max(100).default(20),
  offset: Joi.number().min(0).default(0),
});
