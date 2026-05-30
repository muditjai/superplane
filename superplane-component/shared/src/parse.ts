import type {
  DeployToGcpInput,
  GetCloudRunStatusInput,
  MigrationServiceTarget,
} from './types';
import { tryParseGoFmtString } from './goValueParser';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeValue(value: unknown): unknown {
  if (typeof value === 'string') {
    const go = tryParseGoFmtString(value);
    if (go !== undefined) return go;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  if (Array.isArray(value)) {
    return value.map(normalizeValue);
  }
  if (isRecord(value)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = normalizeValue(v);
    }
    return out;
  }
  return value;
}

function parseGoEvent(event: unknown): Record<string, unknown> | undefined {
  if (typeof event !== 'string') return undefined;
  const parsed = tryParseGoFmtString(event.trim());
  return isRecord(parsed) ? parsed : undefined;
}

/**
 * Unwrap SuperPlane step output / Lambda event shapes:
 * Go fmt strings, JSON, { data: { payload } }, { payload }, plain object.
 */
export function parseSuperPlanePayload<T>(event: unknown): T {
  const directGo = parseGoEvent(event);
  if (directGo) return directGo as T;

  let obj = normalizeValue(event);

  for (let depth = 0; depth < 8; depth++) {
    if (typeof obj === 'string') {
      obj = normalizeValue(obj);
      continue;
    }
    if (!isRecord(obj)) break;

    if (obj.data !== undefined) {
      obj = normalizeValue(obj.data);
      continue;
    }
    if (obj.payload !== undefined) {
      obj = normalizeValue(obj.payload);
      continue;
    }
    if (obj.listResult !== undefined) {
      obj = normalizeValue(obj.listResult);
      continue;
    }
    break;
  }

  if (typeof obj === 'string') {
    obj = normalizeValue(obj);
  }

  return (isRecord(obj) || Array.isArray(obj) ? obj : {}) as T;
}

function unwrapServicesField(value: unknown): unknown {
  if (typeof value === 'string') {
    const parsed = tryParseGoFmtString(value);
    if (parsed !== undefined) return unwrapServicesField(parsed);
    return value;
  }
  if (isRecord(value) && Array.isArray(value.services)) {
    return value.services;
  }
  return value;
}

function toServiceTargets(value: unknown): MigrationServiceTarget[] {
  const unwrapped = unwrapServicesField(value);
  if (!Array.isArray(unwrapped)) return [];
  return unwrapped.filter(isRecord).map((s) => ({
    containerName: String(s.containerName ?? ''),
    image: String(s.image ?? ''),
    imageTag: s.imageTag ? String(s.imageTag) : undefined,
    cloudRunServiceName: String(s.cloudRunServiceName ?? ''),
  }));
}

export function extractServices(event: unknown): MigrationServiceTarget[] {
  const directGo = parseGoEvent(event);
  if (directGo) {
    return toServiceTargets(directGo.services);
  }

  const raw = parseSuperPlanePayload<Record<string, unknown>>(event);
  const fromField = toServiceTargets(raw.services);
  if (fromField.length) return fromField;
  return toServiceTargets(raw);
}

export function parseDeployInput(event: unknown): DeployToGcpInput {
  const directGo = parseGoEvent(event);
  if (directGo) {
    return {
      services: toServiceTargets(directGo.services),
      gcpProjectId:
        typeof directGo.gcpProjectId === 'string'
          ? directGo.gcpProjectId
          : undefined,
      gcpRegion:
        typeof directGo.gcpRegion === 'string' ? directGo.gcpRegion : undefined,
    };
  }

  const raw = parseSuperPlanePayload<Record<string, unknown>>(event);
  const services = extractServices(event);

  return {
    services: services.length ? services : undefined,
    gcpProjectId: typeof raw.gcpProjectId === 'string' ? raw.gcpProjectId : undefined,
    gcpRegion: typeof raw.gcpRegion === 'string' ? raw.gcpRegion : undefined,
    skipContainers: Array.isArray(raw.skipContainers)
      ? (raw.skipContainers as string[])
      : undefined,
  };
}

export function parseStatusInput(event: unknown): GetCloudRunStatusInput {
  const directGo = parseGoEvent(event);
  if (directGo) {
    return {
      gcpProjectId:
        typeof directGo.gcpProjectId === 'string'
          ? directGo.gcpProjectId
          : undefined,
      gcpRegion:
        typeof directGo.gcpRegion === 'string' ? directGo.gcpRegion : undefined,
      serviceNames: Array.isArray(directGo.serviceNames)
        ? (directGo.serviceNames as unknown[]).map(String)
        : undefined,
    };
  }

  const raw = parseSuperPlanePayload<Record<string, unknown>>(event);

  const serviceNames = Array.isArray(raw.serviceNames)
    ? (raw.serviceNames as unknown[]).map(String)
    : undefined;

  if (typeof raw.gcpProjectId === 'string') {
    return {
      gcpProjectId: raw.gcpProjectId,
      gcpRegion: typeof raw.gcpRegion === 'string' ? raw.gcpRegion : undefined,
      serviceNames,
    };
  }

  return raw as GetCloudRunStatusInput;
}
