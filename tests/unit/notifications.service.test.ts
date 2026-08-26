import { NotificationService } from '../../src/notifications/service';
import { NotificationRepository } from '../../src/notifications/repository';

function repositoryMock(): NotificationRepository {
  return {
    createMany: jest.fn().mockImplementation(async (items: Array<Record<string, unknown>>) =>
      items.map((item, index) => ({
        id: `notification-${index + 1}`,
        ...item,
        isRead: false,
        createdAt: new Date('2026-01-01T00:00:00Z'),
      }))),
  } as unknown as NotificationRepository;
}

describe('NotificationService', () => {
  it('dispatches one notification to every non-actor project team member', async () => {
    const repository = repositoryMock();
    const service = new NotificationService(repository, async () => ['user-1', 'user-2', 'user-3']);

    const result = await service.notifyTeamOnProjectChange({
      projectId: 'project-1', orgId: 'org-1', eventType: 'PROJECT_STATUS_CHANGED',
      message: 'Status changed', actorUserId: 'user-1',
    });

    expect(result.map((item) => item.recipientUserId)).toEqual(['user-2', 'user-3']);
    expect(repository.createMany).toHaveBeenCalledTimes(1);
  });
});