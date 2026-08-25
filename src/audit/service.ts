import { AuditRepository } from './repository';
import { ValidationError, InternalServerError } from '../shared/errors';
import { logInfo, logError } from '../shared/logger';
import { AuditEntry } from '../types';

/**
 * Audit Service handles immutable audit log recording
 * All audit entries are write-once and cannot be updated or deleted
 */
export class AuditService {
  constructor(private repository: AuditRepository) {}

  /**
   * Record an immutable audit entry
   * @param entry - Audit entry data
   * @returns Created audit log
   * @throws ValidationError if data is invalid
   * @throws InternalServerError if database write fails
   */
  async recordAudit(entry: AuditEntry): Promise<{
    id: string;
    orgId: string;
    eventType: string;
    entityId: string;
    actorUserId: string;
    createdAt: Date;
  }> {
    try {
      // Validate org isolation
      if (entry.actorOrgId !== entry.orgId) {
        throw new ValidationError(
          'Actor organization must match the organization being audited',
          { field: 'actorOrgId', reason: 'must equal orgId' }
        );
      }

      // Validate that before and after states are not identical
      if (
        entry.beforeState &&
        JSON.stringify(entry.beforeState) === JSON.stringify(entry.afterState)
      ) {
        throw new ValidationError(
          'No state change detected - beforeState and afterState are identical',
          { reason: 'state unchanged' }
        );
      }

      // Create audit entry
      const auditLog = await this.repository.create({
        orgId: entry.orgId,
        eventType: entry.eventType,
        entityType: entry.entityType,
        entityId: entry.entityId,
        actorUserId: entry.actorUserId,
        actorOrgId: entry.actorOrgId,
        actorEmail: entry.actorEmail,
        actorIpAddress: entry.actorIpAddress,
        beforeState: entry.beforeState,
        afterState: entry.afterState,
        changeDescription: entry.changeDescription,
      });

      // Log the audit creation
      logInfo(
        {
          auditId: auditLog.id,
          orgId: entry.orgId,
          eventType: entry.eventType,
          entityId: entry.entityId,
          actorUserId: entry.actorUserId,
        },
        'Audit entry recorded'
      );

      return {
        id: auditLog.id,
        orgId: auditLog.orgId,
        eventType: auditLog.eventType,
        entityId: auditLog.entityId,
        actorUserId: auditLog.actorUserId,
        createdAt: auditLog.createdAt,
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }

      logError(
        {
          orgId: entry.orgId,
          eventType: entry.eventType,
          entityId: entry.entityId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to record audit entry'
      );

      throw new InternalServerError('Failed to record audit entry');
    }
  }

  /**
   * Query audit history with filters
   * @param entityId - Entity ID to query
   * @param orgId - Organization ID (required for isolation)
   * @param filters - Optional filters (eventType, date range)
   * @param limit - Max results
   * @param offset - Pagination offset
   * @returns Array of audit logs
   */
  async queryHistory(
    entityId: string,
    orgId: string,
    filters?: {
      eventType?: string;
      from?: Date;
      to?: Date;
    },
    limit: number = 50,
    offset: number = 0
  ): Promise<{
    data: Array<{
      id: string;
      orgId: string;
      eventType: string;
      entityType: string;
      entityId: string;
      actorUserId: string;
      actorEmail?: string | null;
      beforeState?: Record<string, unknown> | null;
      afterState: Record<string, unknown>;
      createdAt: Date;
    }>;
    total: number;
  }> {
    try {
      const data = await this.repository.find(entityId, orgId, filters, limit, offset);
      const total = await this.repository.count(entityId, orgId, filters);

      logInfo(
        {
          orgId,
          entityId,
          resultCount: data.length,
          total,
        },
        'Audit history queried'
      );

      return {
        data: data.map((log) => ({
          id: log.id,
          orgId: log.orgId,
          eventType: log.eventType,
          entityType: log.entityType,
          entityId: log.entityId,
          actorUserId: log.actorUserId,
          actorEmail: log.actorEmail,
          beforeState: log.beforeState as Record<string, unknown> | null,
          afterState: log.afterState as Record<string, unknown>,
          createdAt: log.createdAt,
        })),
        total,
      };
    } catch (error) {
      logError(
        {
          orgId,
          entityId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to query audit history'
      );

      throw new InternalServerError('Failed to query audit history');
    }
  }
}
