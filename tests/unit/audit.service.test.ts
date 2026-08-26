import { AuditService } from '../../src/audit/service';
import { AuditRepository } from '../../src/audit/repository';
import { ValidationError } from '../../src/shared/errors';

function repositoryMock(): AuditRepository {
  return {
    create: jest.fn().mockResolvedValue({
      id: 'audit-1', orgId: 'org-1', eventType: 'PROJECT_UPDATED', entityId: 'project-1',
      actorUserId: 'user-1', createdAt: new Date('2026-01-01T00:00:00Z'),
    }),
    find: jest.fn(),
    count: jest.fn(),
  } as unknown as AuditRepository;
}

describe('AuditService', () => {
  it('creates an audit entry with complete actor and state data', async () => {
    const repository = repositoryMock();
    const service = new AuditService(repository);

    await service.recordAudit({
      orgId: 'org-1', actorOrgId: 'org-1', actorUserId: 'user-1', entityType: 'Project',
      entityId: 'project-1', eventType: 'PROJECT_STATUS_CHANGED', beforeState: { status: 'active' },
      afterState: { status: 'archived' }, actorIpAddress: '192.0.2.10',
    });

    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
      orgId: 'org-1', actorUserId: 'user-1', beforeState: { status: 'active' },
      afterState: { status: 'archived' }, actorIpAddress: '192.0.2.10',
    }));
  });

  it('does not expose update or delete operations for audit entries', () => {
    const service = new AuditService(repositoryMock());
    expect('updateAudit' in service).toBe(false);
    expect('deleteAudit' in service).toBe(false);
  });

  it('returns audit history filtered by date range', async () => {
    const repository = repositoryMock();
    (repository.find as jest.Mock).mockResolvedValue([{ id: 'audit-1', orgId: 'org-1', eventType: 'PROJECT_UPDATED', entityType: 'Project', entityId: 'project-1', actorUserId: 'user-1', beforeState: {}, afterState: { status: 'active' }, createdAt: new Date() }]);
    (repository.count as jest.Mock).mockResolvedValue(1);
    const service = new AuditService(repository);
    const from = new Date('2026-01-01T00:00:00Z');
    const to = new Date('2026-01-31T23:59:59Z');

    const result = await service.queryHistory('project-1', 'org-1', { from, to });

    expect(repository.find).toHaveBeenCalledWith('project-1', 'org-1', { from, to }, 50, 0);
    expect(result.total).toBe(1);
  });

  it('returns audit history filtered by event type', async () => {
    const repository = repositoryMock();
    (repository.find as jest.Mock).mockResolvedValue([{ id: 'audit-1', orgId: 'org-1', eventType: 'PROJECT_DELETED', entityType: 'Project', entityId: 'project-1', actorUserId: 'user-1', beforeState: {}, afterState: { status: 'deleted' }, createdAt: new Date() }]);
    (repository.count as jest.Mock).mockResolvedValue(1);
    const service = new AuditService(repository);

    const result = await service.queryHistory('project-1', 'org-1', { eventType: 'PROJECT_DELETED' });

    expect(repository.find).toHaveBeenCalledWith('project-1', 'org-1', { eventType: 'PROJECT_DELETED' }, 50, 0);
    expect(result.data[0].eventType).toBe('PROJECT_DELETED');
  });

  it('rejects an audit event whose actor belongs to another organization', async () => {
    const repository = repositoryMock();
    const service = new AuditService(repository);

    await expect(service.recordAudit({
      orgId: 'org-1', actorOrgId: 'org-2', actorUserId: 'user-1', entityType: 'Project',
      entityId: 'project-1', eventType: 'PROJECT_UPDATED', afterState: { status: 'active' },
    })).rejects.toBeInstanceOf(ValidationError);
    expect(repository.create).not.toHaveBeenCalled();
  });
});