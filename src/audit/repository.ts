import { PrismaClient, AuditLog } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Repository for audit log operations
 * Provides data access layer with built-in multi-tenant isolation
 */
export class AuditRepository {
  /**
   * Create a new immutable audit log entry
   * @param data - Audit entry data
   * @returns Created audit log
   */
  async create(data: {
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
  }): Promise<AuditLog> {
    return await prisma.auditLog.create({
      data: {
        orgId: data.orgId,
        eventType: data.eventType,
        entityType: data.entityType,
        entityId: data.entityId,
        actorUserId: data.actorUserId,
        actorOrgId: data.actorOrgId,
        actorEmail: data.actorEmail,
        actorIpAddress: data.actorIpAddress,
        beforeState: data.beforeState,
        afterState: data.afterState,
        changeDescription: data.changeDescription,
      },
    });
  }

  /**
   * Query audit history with multi-tenant isolation
   * @param entityId - The entity being audited
   * @param orgId - Organization ID (required for isolation)
   * @param filters - Optional filters (eventType, date range)
   * @param limit - Max results
   * @param offset - Pagination offset
   * @returns Array of audit logs
   */
  async find(
    entityId: string,
    orgId: string,
    filters?: {
      eventType?: string;
      from?: Date;
      to?: Date;
    },
    limit: number = 50,
    offset: number = 0
  ): Promise<AuditLog[]> {
    const where: Record<string, unknown> = {
      entityId,
      orgId, // CRITICAL: Always include org filter
    };

    if (filters?.eventType) {
      where.eventType = filters.eventType;
    }

    if (filters?.from || filters?.to) {
      where.createdAt = {};
      if (filters.from) {
        (where.createdAt as Record<string, unknown>).gte = filters.from;
      }
      if (filters.to) {
        (where.createdAt as Record<string, unknown>).lte = filters.to;
      }
    }

    return await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Count total audit entries matching criteria
   * @param entityId - The entity being audited
   * @param orgId - Organization ID (required for isolation)
   * @param filters - Optional filters
   * @returns Total count
   */
  async count(
    entityId: string,
    orgId: string,
    filters?: {
      eventType?: string;
      from?: Date;
      to?: Date;
    }
  ): Promise<number> {
    const where: Record<string, unknown> = {
      entityId,
      orgId, // CRITICAL: Always include org filter
    };

    if (filters?.eventType) {
      where.eventType = filters.eventType;
    }

    if (filters?.from || filters?.to) {
      where.createdAt = {};
      if (filters.from) {
        (where.createdAt as Record<string, unknown>).gte = filters.from;
      }
      if (filters.to) {
        (where.createdAt as Record<string, unknown>).lte = filters.to;
      }
    }

    return await prisma.auditLog.count({ where });
  }

  /**
   * NOTE: NO UPDATE or DELETE methods
   * Audit entries are immutable and append-only
   */
}
