import { PrismaClient, Project } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Repository for project operations
 * Provides data access layer with built-in multi-tenant isolation
 */
export class ProjectRepository {
  /**
   * Create a new project
   * @param data - Project data
   * @returns Created project
   */
  async create(data: {
    orgId: string;
    name: string;
    description?: string;
    status?: string;
    createdBy: string;
  }): Promise<Project> {
    return await prisma.project.create({
      data: {
        orgId: data.orgId,
        name: data.name,
        description: data.description,
        status: data.status || 'active',
        createdBy: data.createdBy,
      },
    });
  }

  /**
   * Get a project by ID with org isolation
   * @param projectId - Project ID
   * @param orgId - Organization ID (required for isolation)
   * @returns Project or null
   */
  async findById(projectId: string, orgId: string): Promise<Project | null> {
    return await prisma.project.findFirst({
      where: {
        id: projectId,
        orgId, // CRITICAL: Always include org filter
      },
    });
  }

  /**
   * List projects for an organization
   * @param orgId - Organization ID
   * @param limit - Max results
   * @param offset - Pagination offset
   * @returns Array of projects
   */
  async findByOrgId(
    orgId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Project[]> {
    return await prisma.project.findMany({
      where: {
        orgId, // CRITICAL: Always include org filter
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Count projects in an organization
   * @param orgId - Organization ID
   * @returns Total count
   */
  async countByOrgId(orgId: string): Promise<number> {
    return await prisma.project.count({
      where: { orgId },
    });
  }

  /**
   * Update a project
   * @param projectId - Project ID
   * @param orgId - Organization ID (required for isolation)
   * @param data - Updated data
   * @returns Updated project
   */
  async update(
    projectId: string,
    orgId: string,
    data: Partial<{
      name: string;
      description: string;
      status: string;
    }>
  ): Promise<Project> {
    return await prisma.project.update({
      where: {
        id_orgId: {
          id: projectId,
          orgId,
        },
      },
      data,
    });
  }

  /**
   * Delete a project (soft delete via status)
   * @param projectId - Project ID
   * @param orgId - Organization ID (required for isolation)
   * @returns Updated project
   */
  async softDelete(projectId: string, orgId: string): Promise<Project> {
    return await prisma.project.update({
      where: {
        id_orgId: {
          id: projectId,
          orgId,
        },
      },
      data: {
        status: 'deleted',
      },
    });
  }
}
