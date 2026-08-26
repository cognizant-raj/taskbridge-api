import { NotificationRepository } from './repository';
import { ValidationError, InternalServerError, NotFoundError } from '../shared/errors';
import { logInfo, logError } from '../shared/logger';
import { ProjectChangeEvent } from '../types';

/**
 * Notification Service handles real-time notifications
 * Dispatches notifications to team members on project changes
 */
export class NotificationService {
  constructor(
    private repository: NotificationRepository,
    private readonly teamMemberProvider: (projectId: string, orgId: string) => Promise<string[]> =
      (projectId: string, orgId: string): Promise<string[]> =>
        repository.findProjectTeamMemberIds(projectId, orgId)
  ) {}

  /**
   * Notify team members about a project change
   * @param event - Project change event details
   * @returns Array of created notifications
   * @throws InternalServerError if notification dispatch fails
   */
  async notifyTeamOnProjectChange(event: ProjectChangeEvent): Promise<Array<{
    id: string;
    recipientUserId: string;
    orgId: string;
    eventType: string;
    projectId: string;
    message: string;
    isRead: boolean;
    createdAt: Date;
  }>> {
    try {
      const teamMembers = await this.teamMemberProvider(event.projectId, event.orgId);

      // Filter out the actor (person who made the change)
      const recipientIds = teamMembers
        .filter((member) => member !== event.actorUserId)
        .map((member) => member);

      if (recipientIds.length === 0) {
        logInfo(
          {
            projectId: event.projectId,
            orgId: event.orgId,
            actorUserId: event.actorUserId,
          },
          'No team members to notify'
        );
        return [];
      }

      // Create notifications for all recipients
      const notificationData = recipientIds.map((recipientUserId) => ({
        recipientUserId,
        orgId: event.orgId,
        eventType: event.eventType,
        projectId: event.projectId,
        message: event.message,
        actionUrl: event.actionUrl,
      }));

      const notifications = await this.repository.createMany(notificationData);

      logInfo(
        {
          projectId: event.projectId,
          orgId: event.orgId,
          notificationCount: notifications.length,
          eventType: event.eventType,
        },
        'Project change notifications sent'
      );

      return notifications.map((notif) => ({
        id: notif.id,
        recipientUserId: notif.recipientUserId,
        orgId: notif.orgId,
        eventType: notif.eventType,
        projectId: notif.projectId,
        message: notif.message,
        isRead: notif.isRead,
        createdAt: notif.createdAt,
      }));
    } catch (error) {
      logError(
        {
          projectId: event.projectId,
          orgId: event.orgId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to dispatch notifications'
      );

      throw new InternalServerError('Failed to dispatch notifications');
    }
  }

  /**
   * Get notifications for a user
   * @param recipientUserId - User ID
   * @param orgId - Organization ID
   * @param filters - Optional filters (isRead)
   * @param limit - Max results
   * @param offset - Pagination offset
   * @returns Notifications and metadata
   */
  async getNotifications(
    recipientUserId: string,
    orgId: string,
    filters?: {
      isRead?: boolean;
    },
    limit: number = 20,
    offset: number = 0
  ): Promise<{
    data: Array<{
      id: string;
      recipientUserId: string;
      eventType: string;
      projectId: string;
      message: string;
      actionUrl?: string | null;
      isRead: boolean;
      readAt?: Date | null;
      createdAt: Date;
    }>;
    total: number;
    unreadCount: number;
  }> {
    try {
      const data = await this.repository.findByRecipient(
        recipientUserId,
        orgId,
        filters,
        limit,
        offset
      );
      const total = await this.repository.countByRecipient(recipientUserId, orgId);
      const unreadCount = await this.repository.countByRecipient(recipientUserId, orgId, {
        isRead: false,
      });

      logInfo(
        {
          recipientUserId,
          orgId,
          resultCount: data.length,
          total,
          unreadCount,
        },
        'Notifications retrieved'
      );

      return {
        data: data.map((notif) => ({
          id: notif.id,
          recipientUserId: notif.recipientUserId,
          eventType: notif.eventType,
          projectId: notif.projectId,
          message: notif.message,
          actionUrl: notif.actionUrl,
          isRead: notif.isRead,
          readAt: notif.readAt,
          createdAt: notif.createdAt,
        })),
        total,
        unreadCount,
      };
    } catch (error) {
      logError(
        {
          recipientUserId,
          orgId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to retrieve notifications'
      );

      throw new InternalServerError('Failed to retrieve notifications');
    }
  }

  /**
   * Mark a notification as read
   * @param notificationId - Notification ID
   * @param orgId - Organization ID
   * @returns Updated notification
   */
  async markNotificationAsRead(notificationId: string, orgId: string): Promise<{
    id: string;
    recipientUserId: string;
    isRead: boolean;
    readAt?: Date | null;
  }> {
    try {
      const notification = await this.repository.markAsRead(notificationId, orgId);

      logInfo(
        { notificationId, orgId },
        'Notification marked as read'
      );

      return {
        id: notification.id,
        recipientUserId: notification.recipientUserId,
        isRead: notification.isRead,
        readAt: notification.readAt,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        throw new NotFoundError('Notification not found');
      }

      logError(
        {
          notificationId,
          orgId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to mark notification as read'
      );

      throw new InternalServerError('Failed to mark notification as read');
    }
  }

}
