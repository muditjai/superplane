import type { Context } from 'aws-lambda';
import { GoogleAuth } from 'google-auth-library';
import type {
  DeployToGcpOutput,
  MigrationServiceTarget,
} from '@superplane/component-shared';
import { parseDeployInput } from '@superplane/component-shared';

function logIO(phase: 'input' | 'output', data: unknown): void {
  console.log(`[deploy-to-gcp] ${phase}:`, JSON.stringify(data));
}

const RUN_SCOPE = 'https://www.googleapis.com/auth/cloud-platform';

function resolveGcpImage(
  svc: MigrationServiceTarget,
  prefix: string
): string {
  if (process.env.GCP_USE_ECR_IMAGE === 'true') {
    return svc.image;
  }
  const tag = svc.imageTag || 'latest';
  return `${prefix}/${svc.cloudRunServiceName}:${tag}`;
}

async function gcpFetch(
  path: string,
  init: RequestInit,
  projectId: string
): Promise<Response> {
  const credentialsJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const auth = new GoogleAuth({
    scopes: [RUN_SCOPE],
    credentials: credentialsJson ? JSON.parse(credentialsJson) : undefined,
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  const url = `https://run.googleapis.com/v2/projects/${projectId}${path}`;
  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token.token}`,
      'Content-Type': 'application/json',
      ...(init.headers as Record<string, string>),
    },
  });
}

async function deployService(
  projectId: string,
  region: string,
  svc: MigrationServiceTarget,
  image: string
): Promise<string> {
  const serviceName = svc.cloudRunServiceName;
  const parent = `/locations/${region}`;
  const getResp = await gcpFetch(
    `${parent}/services/${serviceName}`,
    { method: 'GET' },
    projectId
  );

  if (getResp.status === 404) {
    const createResp = await gcpFetch(
      `${parent}/services?serviceId=${serviceName}`,
      {
        method: 'POST',
        body: JSON.stringify({
          template: {
            containers: [{ image }],
          },
        }),
      },
      projectId
    );
    if (!createResp.ok) {
      throw new Error(
        `Create ${serviceName} failed: ${await createResp.text()}`
      );
    }
    return serviceName;
  }

  if (!getResp.ok) {
    throw new Error(`Get ${serviceName} failed: ${getResp.status}`);
  }

  const existing = (await getResp.json()) as {
    template?: { containers?: Array<{ image?: string }> };
  };
  const patchResp = await gcpFetch(
    `${parent}/services/${serviceName}?updateMask=template.containers`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        template: {
          ...existing.template,
          containers: [{ ...(existing.template?.containers?.[0] ?? {}), image }],
        },
      }),
    },
    projectId
  );

  if (!patchResp.ok) {
    throw new Error(`Update ${serviceName} failed: ${await patchResp.text()}`);
  }

  return serviceName;
}

/**
 * Sample input — entire payload is Go fmt string from SuperPlane:
 * map[services:[map[cloudRunServiceName:storage-service containerName:storage-service image:590184027793.dkr.ecr.us-east-1.amazonaws.com/superplane-storage-service:latest imageTag:latest] ...]]
 *
 * SuperPlane payload expression:
 * {{ steps.list_ecs.output.data.payload }}
 *
 * Sample output (pass to get-cloudrun-status):
 * {
 *   "gcpProjectId": "migracle-gcp-4-1",
 *   "gcpRegion": "us-central1",
 *   "serviceNames": ["storage-service", "search-service"]
 * }
 */
export async function handler(
  event: unknown,
  _context: Context
): Promise<DeployToGcpOutput> {
  const input = parseDeployInput(event);
  logIO('input', { raw: event, parsed: input });
  const gcpProjectId =
    input.gcpProjectId || process.env.GCP_PROJECT_ID || '';
  const gcpRegion =
    input.gcpRegion || process.env.GCP_REGION || 'us-central1';
  const imagePrefix =
    process.env.GCP_IMAGE_PREFIX ||
    `${gcpRegion}-docker.pkg.dev/${gcpProjectId}/superplane-migration`;

  if (!gcpProjectId) {
    throw new Error('gcpProjectId required (payload or GCP_PROJECT_ID env)');
  }

  const services = input.services ?? [];
  if (!services.length) {
    throw new Error('Provide services array from list-ecs-tasks step');
  }

  const skip = new Set(input.skipContainers ?? ['gateway']);
  const serviceNames: string[] = [];

  for (const svc of services) {
    if (skip.has(svc.containerName)) continue;
    const image = resolveGcpImage(svc, imagePrefix);
    serviceNames.push(await deployService(gcpProjectId, gcpRegion, svc, image));
  }

  const output = { gcpProjectId, gcpRegion, serviceNames };
  logIO('output', output);
  return output;
}
