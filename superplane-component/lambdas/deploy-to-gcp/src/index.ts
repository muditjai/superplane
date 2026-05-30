import type { Context } from 'aws-lambda';
import { GoogleAuth } from 'google-auth-library';
import type {
  DeployToGcpInput,
  DeployToGcpOutput,
  GcpDeploymentResult,
  ListEcsTasksOutput,
  MigrationServiceTarget,
} from '@superplane/component-shared';

const RUN_SCOPE = 'https://www.googleapis.com/auth/cloud-platform';

function parseInput(event: unknown): DeployToGcpInput {
  const raw =
    typeof event === 'string'
      ? JSON.parse(event)
      : (event as Record<string, unknown>)?.payload ?? event;
  return (raw ?? {}) as DeployToGcpInput;
}

function resolveServices(input: DeployToGcpInput): MigrationServiceTarget[] {
  if (input.services?.length) return input.services;
  const list = input.listResult as ListEcsTasksOutput | undefined;
  if (list?.services?.length) return list.services;
  throw new Error('Provide listResult (from list-ecs-tasks) or services array');
}

function resolveGcpImage(
  svc: MigrationServiceTarget,
  prefix: string
): string {
  if (process.env.GCP_USE_ECR_IMAGE === 'true') {
    return svc.image;
  }
  const tag = svc.imageTag || 'latest';
  const name = svc.cloudRunServiceName;
  return `${prefix}/${name}:${tag}`;
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
): Promise<GcpDeploymentResult> {
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
      const err = await createResp.text();
      return {
        containerName: svc.containerName,
        cloudRunService: serviceName,
        image,
        status: 'failed',
        message: `Create failed: ${err}`,
      };
    }
    const created = (await createResp.json()) as {
      uri?: string;
      latestReadyRevision?: string;
    };
    return {
      containerName: svc.containerName,
      cloudRunService: serviceName,
      image,
      status: 'deployed',
      url: created.uri,
      revision: created.latestReadyRevision,
      message: 'Created new Cloud Run service',
    };
  }

  if (!getResp.ok) {
    return {
      containerName: svc.containerName,
      cloudRunService: serviceName,
      image,
      status: 'failed',
      message: `Get service failed: ${getResp.status}`,
    };
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
    const err = await patchResp.text();
    return {
      containerName: svc.containerName,
      cloudRunService: serviceName,
      image,
      status: 'failed',
      message: `Update failed: ${err}`,
    };
  }

  const updated = (await patchResp.json()) as {
    uri?: string;
    latestReadyRevision?: string;
  };
  return {
    containerName: svc.containerName,
    cloudRunService: serviceName,
    image,
    status: 'deployed',
    url: updated.uri,
    revision: updated.latestReadyRevision,
    message: 'Updated Cloud Run service',
  };
}

export async function handler(
  event: unknown,
  _context: Context
): Promise<DeployToGcpOutput> {
  const input = parseInput(event);
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

  const skip = new Set(
    input.skipContainers ?? ['gateway']
  );
  const services = resolveServices(input).filter(
    (s) => !skip.has(s.containerName)
  );

  const deployments: GcpDeploymentResult[] = [];
  for (const svc of services) {
    const image = resolveGcpImage(svc, imagePrefix);
    deployments.push(await deployService(gcpProjectId, gcpRegion, svc, image));
  }

  return { gcpProjectId, gcpRegion, deployments };
}
