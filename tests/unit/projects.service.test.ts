import { ProjectService } from '../../src/projects/service';
import { ProjectRepository } from '../../src/projects/repository';
import { AuditRepository } from '../../src/audit/repository';
import { NotificationRepository } from '../../src/notifications/repository';

describe('ProjectService', () => {
  it('passes both team and organization to the repository', async () => {
    const repository = { findByTeam: jest.fn().mockResolvedValue([]) } as unknown as ProjectRepository;
    const service = new ProjectService(
      repository,
      {} as AuditRepository,
      {} as NotificationRepository
    );

    await service.getProjectsByTeam('team-1', 'org-1');

    expect(repository.findByTeam).toHaveBeenCalledWith('team-1', 'org-1');
  });
});