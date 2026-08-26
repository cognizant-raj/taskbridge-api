import { Project } from './model';

const projects: Project[] = [];

export class ProjectService {
  create(name: string, teamId: string): Project {
    const project = { id: Date.now().toString(), name, teamId, status: 'active' };
    projects.push(project);
    return project;
  }

  updateStatus(id: string, status: string): Project | undefined {
    const project = projects.find((item) => item.id === id);
    if (project) project.status = status;
    return project;
  }

  getByTeam(teamId: string): Project[] {
    return projects.filter((project) => project.teamId === teamId);
  }

  delete(id: string): boolean {
    const index = projects.findIndex((project) => project.id === id);
    if (index < 0) return false;
    projects.splice(index, 1);
    return true;
  }
}
