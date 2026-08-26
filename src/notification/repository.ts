import { PrismaClient, Notification } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Repository for notification operations
 * Provides data access layer with built-in multi-tenant isolation
 */
export class NotificationRepository {
  /**
   * Find all project members in the same tenant for notification dispatch.
   * @param projectId - Project identifier
   * @param orgId - Organization identifier
   * @returns User identifiers for the project team
   */
  async findProjectTeamMemberIds(projectId: string, orgId: string): Promise<string[]> {
    const members = await prisma.projectMember.findMany({
      where: { projectId, orgId },
      select: { userId: true },
    });
    return members.map((member) => member.userId);
  }
  /**
   * Create a new notification
   * @param data - Notification data
   * @returns Created notification
   */
  async create(data: {
    recipientUserId: string;
    orgId: string;
    eventType: string;
    projectId: string;
    message: string;
    actionUrl?: string;
  }): Promise<Notification> {
    return await prisma.notification.create({
      data: {
        recipientUserId: data.recipientUserId,
        orgId: data.orgId,
        eventType: data.eventType,
        projectId: data.projectId,
        message: data.message,
        actionUrl: data.actionUrl,
      },
    });
  }

  /**
   * Create multiple notifications in a batch
   * @param notifications - Array of notification data
   * @returns Array of created notifications
   */
  async createMany(
    notifications: Array<{
      recipientUserId: string;
      orgId: string;
      eventType: string;
      projectId: string;
      message: string;
      actionUrl?: string;
    }>
  ): Promise<Notification[]> {
    const created = await Promise.all(
      notifications.map((notif) => this.create(notif))
    );
    return created;
  }

  /**
   * Get notifications for a user with filters
   * @param recipientUserId - User ID
   * @param orgId - Organization ID (required for isolation)
   * @param filters - Optional filters (isRead)
   * @param limit - Max results
   * @param offset - Pagination offset
   * @returns Array of notifications
   */
  async findByRecipient(
    recipientUserId: string,
    orgId: string,
    filters?: {
      isRead?: boolean;
    },
    limit: number = 20,
    offset: number = 0
  ): Promise<Notification[]> {
    const where: Record<string, unknown> = {
      recipientUserId,
      orgId, // CRITICAL: Always include org filter
    };

    if (filters?.isRead !== undefined) {
      where.isRead = filters.isRead;
    }

    return await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Count notifications for a user
   * @param recipientUserId - User ID
   * @param orgId - Organization ID (required for isolation)
   * @param filters - Optional filters
   * @returns Total count
   */
  async countByRecipient(
    recipientUserId: string,
    orgId: string,
    filters?: {
      isRead?: boolean;
    }
  ): Promise<number> {
    const where: Record<string, unknown> = {
      recipientUserId,
      orgId, // CRITICAL: Always include org filter
    };

    if (filters?.isRead !== undefined) {
      where.isRead = filters.isRead;
    }

    return await prisma.notification.count({ where });
  }

  /**
   * Mark a notification as read
   * @param notificationId - Notification ID
   * @param orgId - Organization ID (required for isolation)
   * @returns Updated notification
   */
  async markAsRead(notificationId: string, orgId: string): Promise<Notification> {
    return await prisma.notification.update({
      where: {
        id_orgId: { // Use composite unique key for safety
          id: notificationId,
          orgId,
        },
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Find a specific notification
   * @param notificationId - Notification ID
   * @param orgId - Organization ID (required for isolation)
   * @returns Notification or null
   */
  async findById(notificationId: string, orgId: string): Promise<Notification | null> {
    return await prisma.notification.findFirst({
      where: {
        id: notificationId,
        orgId, // CRITICAL: Always include org filter
      },
    });
  }
}
