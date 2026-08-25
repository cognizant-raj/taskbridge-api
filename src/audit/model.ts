/**
 * Audit Log Model and Type Definitions
 */

export interface AuditLogModel {
  id: string;
  orgId: string;
  eventType: string;
  entityType: string;
  entityId: string;
  actorUserId: string;
  actorOrgId: string;
  actorEmail?: string;
  actorIpAddress?: string;
  beforeState?: Record<string, unknown>;
  afterState: Record<string, unknown>;
  changeDescription?: string;
  createdAt: Date;
}

export type AuditEventType =
  | 'PROJECT_CREATED'
  | 'PROJECT_UPDATED'
  | 'PROJECT_DELETED'
  | 'PROJECT_STATUS_CHANGED'
  | 'MILESTONE_REOPENED';
