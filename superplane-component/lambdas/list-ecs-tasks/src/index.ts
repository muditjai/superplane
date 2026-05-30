import type { Context } from 'aws-lambda';
import {
  DescribeTasksCommand,
  ECSClient,
  ListTasksCommand,
  type Container,
  type Task,
} from '@aws-sdk/client-ecs';
import type {
  EcsContainerSummary,
  EcsTaskSummary,
  ListEcsTasksOutput,
  MigrationServiceTarget,
} from '@superplane/component-shared';

export interface ListEcsTasksInput {
  cluster?: string;
  region?: string;
  service?: string;
}

function parseInput(event: unknown): ListEcsTasksInput {
  const raw =
    typeof event === 'string'
      ? JSON.parse(event)
      : (event as Record<string, unknown>)?.payload ?? event;
  return (raw ?? {}) as ListEcsTasksInput;
}

function summarizeContainer(c: Container): EcsContainerSummary {
  return {
    name: c.name ?? 'unknown',
    image: c.image ?? '',
    lastStatus: c.lastStatus ?? 'UNKNOWN',
    healthStatus: c.healthStatus,
  };
}

function summarizeTask(task: Task): EcsTaskSummary {
  return {
    taskArn: task.taskArn ?? '',
    taskDefinitionArn: task.taskDefinitionArn ?? '',
    lastStatus: task.lastStatus ?? 'UNKNOWN',
    startedAt: task.startedAt?.toISOString(),
    containers: (task.containers ?? []).map(summarizeContainer),
  };
}

function parseImage(image: string): { ecrRepository?: string; imageTag?: string } {
  const match = image.match(/\/([^/:]+)(?::(.+))?$/);
  if (!match) return {};
  return { ecrRepository: match[1], imageTag: match[2] || 'latest' };
}

function toCloudRunName(containerName: string): string {
  return containerName.replace(/_/g, '-').toLowerCase();
}

function extractServices(tasks: EcsTaskSummary[]): MigrationServiceTarget[] {
  const seen = new Set<string>();
  const services: MigrationServiceTarget[] = [];
  for (const task of tasks) {
    for (const c of task.containers) {
      if (seen.has(c.name)) continue;
      seen.add(c.name);
      const { ecrRepository, imageTag } = parseImage(c.image);
      services.push({
        containerName: c.name,
        image: c.image,
        ecrRepository,
        imageTag,
        cloudRunServiceName: toCloudRunName(c.name),
      });
    }
  }
  return services;
}

export async function handler(
  event: unknown,
  _context: Context
): Promise<ListEcsTasksOutput> {
  const input = parseInput(event);
  const region = input.region || process.env.AWS_REGION || 'us-east-1';
  const cluster = input.cluster || process.env.ECS_CLUSTER || 'superplane-cluster';

  const ecs = new ECSClient({ region });

  const listResp = await ecs.send(
    new ListTasksCommand({
      cluster,
      serviceName: input.service,
      desiredStatus: 'RUNNING',
    })
  );

  const taskArns = listResp.taskArns ?? [];
  if (taskArns.length === 0) {
    return {
      cluster,
      region,
      taskCount: 0,
      tasks: [],
      services: [],
    };
  }

  const describeResp = await ecs.send(
    new DescribeTasksCommand({ cluster, tasks: taskArns })
  );

  const tasks = (describeResp.tasks ?? []).map(summarizeTask);
  const services = extractServices(tasks);

  return {
    cluster,
    region,
    taskCount: tasks.length,
    tasks,
    services,
  };
}
