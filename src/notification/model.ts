/**
 * Notification Model and Type Definitions
 */

export interface NotificationModel {
  id: string;
  recipientUserId: string;
  orgId: string;
  eventType: string;
  projectId: string;
  message: string;
  actionUrl?: string;
  isRead: boolean;
  readAt?: Date | null;
  createdAt: Date;
}
