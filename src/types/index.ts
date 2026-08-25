/**
 * Global TypeScript type definitions
 */

export type AuditEventType =
  | 'PROJECT_CREATED'
  | 'PROJECT_UPDATED'
  | 'PROJECT_DELETED'
  | 'PROJECT_STATUS_CHANGED'
  | 'MILESTONE_REOPENED';

export interface AuditEntry {
  orgId: string;
  eventType: AuditEventType;
  entityType: string;
  entityId: string;
  actorUserId: string;
  actorOrgId: string;
  actorEmail?: string;
  actorIpAddress?: string;
  beforeState?: Record<string, unknown>;
  afterState: Record<string, unknown>;
  changeDescription?: string;
}

export interface ProjectChangeEvent {
  projectId: string;
  orgId: string;
  eventType: AuditEventType;
  message: string;
  actorUserId: string;
  actionUrl?: string;
}

export interface NotificationPayload {
  recipientUserId: string;
  orgId: string;
  eventType: AuditEventType;
  projectId: string;
  message: string;
  actionUrl?: string;
}
