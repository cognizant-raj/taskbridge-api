import { Router, Response } from 'express';
import { NotificationService } from './service';
import { NotificationRepository } from './repository';
import { AuthenticatedRequest, authenticateJWT } from '../shared/middleware';
import { notificationQuerySchema } from '../shared/validation';
import { ValidationError, NotFoundError, AuthorizationError } from '../shared/errors';
import { logInfo } from '../shared/logger';

const router = Router();
const notificationRepository = new NotificationRepository();
const notificationService = new NotificationService(notificationRepository);

/**
 * GET /notifications/:userId
 * Get all notifications for a user
 * Authentication: JWT (can only access own notifications or admin)
 */
router.get('/notifications/:userId', authenticateJWT, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { userId } = req.params;

    // Verify user can only access their own notifications
    if (req.userId !== userId && !isAdmin(req.userId)) {
      throw new AuthorizationError('You can only access your own notifications');
    }

    if (!req.orgId) {
      throw new NotFoundError('Organization context missing');
    }

    const { error, value } = notificationQuerySchema.validate(req.query);
    if (error) {
      throw new ValidationError(error.message);
    }

    const result = await notificationService.getNotifications(
      userId,
      req.orgId,
      { isRead: value.isRead },
      value.limit,
      value.offset
    );

    logInfo(
      { userId, orgId: req.orgId, resultCount: result.data.length },
      'Notifications retrieved'
    );

    res.json({
      data: result.data,
      pagination: {
        total: result.total,
        unreadCount: result.unreadCount,
        limit: value.limit,
        offset: value.offset,
        hasMore: value.offset + value.limit < result.total,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /notifications/:id/read
 * Mark a notification as read
 * Authentication: JWT (can only mark own notifications as read)
 */
router.patch('/notifications/:id/read', authenticateJWT, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { id } = req.params;

    if (!req.orgId) {
      throw new NotFoundError('Organization context missing');
    }

    // Verify the notification belongs to the user
    const notification = await notificationRepository.findById(id, req.orgId);
    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    if (notification.recipientUserId !== req.userId && !isAdmin(req.userId)) {
      throw new AuthorizationError('You can only mark your own notifications as read');
    }

    const result = await notificationService.markNotificationAsRead(id, req.orgId);

    logInfo(
      { notificationId: id, orgId: req.orgId },
      'Notification marked as read'
    );

    res.json({
      id: result.id,
      recipientUserId: result.recipientUserId,
      isRead: result.isRead,
      readAt: result.readAt,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Mock admin check
 * In production, this would verify against actual role/permission system
 */
function isAdmin(userId?: string): boolean {
  // Mock implementation
  return false;
}

export default router;
