import type { Context } from 'aws-lambda';
import {
  DescribeTasksCommand,
  ECSClient,
  ListTasksCommand,
  type Task,
} from '@aws-sdk/client-ecs';
import type {
  ListEcsTasksOutput,
  MigrationServiceTarget,
} from '@superplane/component-shared';
import { parseSuperPlanePayload } from '@superplane/component-shared';

function logIO(phase: 'input' | 'output', data: unknown): void {
  console.log(`[list-ecs-tasks] ${phase}:`, JSON.stringify(data));
}

export interface ListEcsTasksInput {
  cluster?: string;
  region?: string;
  service?: string;
}

function parseInput(event: unknown): ListEcsTasksInput {
  return parseSuperPlanePayload<ListEcsTasksInput>(event);
}

function parseImage(image: string): { imageTag?: string } {
  const match = image.match(/\/([^/:]+)(?::(.+))?$/);
  if (!match) return {};
  return { imageTag: match[2] || 'latest' };
}

function toCloudRunName(containerName: string): string {
  return containerName.replace(/_/g, '-').toLowerCase();
}

function extractServices(tasks: Task[]): MigrationServiceTarget[] {
  const seen = new Set<string>();
  const services: MigrationServiceTarget[] = [];
  for (const task of tasks) {
    for (const c of task.containers ?? []) {
      const name = c.name ?? 'unknown';
      if (seen.has(name)) continue;
      seen.add(name);
      const { imageTag } = parseImage(c.image ?? '');
      services.push({
        containerName: name,
        image: c.image ?? '',
        imageTag,
        cloudRunServiceName: toCloudRunName(name),
      });
    }
  }
  return services;
}

/**
 * Sample input:
 * { "cluster": "superplane-cluster", "service": "superplane-app" }
 *
 * Sample output (pass entire SuperPlane step output to deploy-to-gcp):
 * {
 *   "services": [
 *     {
 *       "containerName": "storage-service",
 *       "image": "590184027793.dkr.ecr.us-east-1.amazonaws.com/superplane-storage-service:latest",
 *       "imageTag": "latest",
 *       "cloudRunServiceName": "storage-service"
 *     }
 *   ]
 * }
 */
export async function handler(
  event: unknown,
  _context: Context
): Promise<ListEcsTasksOutput> {
  const input = parseInput(event);
  logIO('input', { raw: event, parsed: input });
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
    const output = { services: [] };
    logIO('output', output);
    return output;
  }

  const describeResp = await ecs.send(
    new DescribeTasksCommand({ cluster, tasks: taskArns })
  );

  const output = {
    services: extractServices(describeResp.tasks ?? []),
  };
  logIO('output', output);
  return output;
}
