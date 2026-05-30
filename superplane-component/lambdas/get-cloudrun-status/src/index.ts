import type { Context } from 'aws-lambda';
import { GoogleAuth } from 'google-auth-library';
import type {
  CloudRunServiceStatus,
  GetCloudRunStatusInput,
  GetCloudRunStatusOutput,
} from '@superplane/component-shared';

const RUN_SCOPE = 'https://www.googleapis.com/auth/cloud-platform';

function parseInput(event: unknown): GetCloudRunStatusInput {
  const raw =
    typeof event === 'string'
      ? JSON.parse(event)
      : (event as Record<string, unknown>)?.payload ?? event;
  return (raw ?? {}) as GetCloudRunStatusInput;
}

async function gcpFetch(
  path: string,
  projectId: string
): Promise<Response> {
  const credentialsJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const auth = new GoogleAuth({
    scopes: [RUN_SCOPE],
    credentials: credentialsJson ? JSON.parse(credentialsJson) : undefined,
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  return fetch(`https://run.googleapis.com/v2/projects/${projectId}${path}`, {
    headers: { Authorization: `Bearer ${token.token}` },
  });
}

function mapService(raw: Record<string, unknown>): CloudRunServiceStatus {
  const name = String(raw.name ?? '').split('/').pop() ?? '';
  const conditions = (raw.conditions as Array<Record<string, unknown>> | undefined)?.map(
    (c) => ({
      type: String(c.type ?? ''),
      state: String(c.state ?? ''),
      message: c.message ? String(c.message) : undefined,
    })
  );
  const traffic = (
    raw.traffic as Array<Record<string, unknown>> | undefined
  )?.map((t) => ({
    revision: String(t.revision ?? '').split('/').pop() ?? '',
    percent: Number(t.percent ?? 0),
  }));
  return {
    name,
    uri: raw.uri ? String(raw.uri) : undefined,
    latestRevision: raw.latestReadyRevision
      ? String(raw.latestReadyRevision).split('/').pop()
      : undefined,
    conditions,
    traffic,
  };
}

export async function handler(
  event: unknown,
  _context: Context
): Promise<GetCloudRunStatusOutput> {
  const input = parseInput(event);
  const gcpProjectId =
    input.gcpProjectId || process.env.GCP_PROJECT_ID || '';
  const gcpRegion =
    input.gcpRegion || process.env.GCP_REGION || 'us-central1';

  if (!gcpProjectId) {
    throw new Error('gcpProjectId required (payload or GCP_PROJECT_ID env)');
  }

  const services: CloudRunServiceStatus[] = [];

  if (input.serviceNames?.length) {
    for (const svc of input.serviceNames) {
      const resp = await gcpFetch(
        `/locations/${gcpRegion}/services/${svc}`,
        gcpProjectId
      );
      if (resp.ok) {
        services.push(mapService((await resp.json()) as Record<string, unknown>));
      } else {
        services.push({
          name: svc,
          conditions: [
            {
              type: 'Ready',
              state: 'FAILED',
              message: `HTTP ${resp.status}`,
            },
          ],
        });
      }
    }
  } else {
    const resp = await gcpFetch(
      `/locations/${gcpRegion}/services`,
      gcpProjectId
    );
    if (!resp.ok) {
      throw new Error(`List services failed: ${resp.status} ${await resp.text()}`);
    }
    const body = (await resp.json()) as { services?: Record<string, unknown>[] };
    for (const raw of body.services ?? []) {
      services.push(mapService(raw));
    }
  }

  return { gcpProjectId, gcpRegion, services };
}
