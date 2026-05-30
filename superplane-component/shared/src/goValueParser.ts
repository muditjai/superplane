/** Keys emitted by SuperPlane / Go fmt for migration payloads. */
const MAP_KEYS = new Set([
  'cloudRunServiceName',
  'containerName',
  'image',
  'imageTag',
  'ecrRepository',
  'services',
  'gcpProjectId',
  'gcpRegion',
  'serviceNames',
]);

function skipWs(s: string, i: number): number {
  while (i < s.length && s[i] === ' ') i++;
  return i;
}

function readIdentifier(
  s: string,
  i: number
): { id: string; end: number } | null {
  const m = /^[a-zA-Z][a-zA-Z0-9]*/.exec(s.slice(i));
  if (!m) return null;
  return { id: m[0], end: i + m[0].length };
}

function isNextMapKey(s: string, i: number): boolean {
  const id = readIdentifier(s, i);
  return id !== null && s[id.end] === ':' && MAP_KEYS.has(id.id);
}

function parseScalar(s: string, i: number): { value: string; i: number } {
  const start = i;
  while (i < s.length) {
    if (s[i] === ']') break;
    if (s[i] === ' ') {
      const j = skipWs(s, i);
      if (j >= s.length || s[j] === ']') break;
      if (s.startsWith('map[', j)) break;
      if (s[j] === '[') break;
      if (isNextMapKey(s, j)) break;
    }
    i++;
  }
  return { value: s.slice(start, i).trim(), i };
}

function parseSliceItem(s: string, i: number): { value: unknown; i: number } {
  i = skipWs(s, i);
  if (s.startsWith('map[', i) || s[i] === '[') {
    return parseValue(s, i);
  }
  const m = /^[^\s\]]+/.exec(s.slice(i));
  if (!m) {
    throw new Error(`Expected slice element near index ${i}`);
  }
  return { value: m[0], i: i + m[0].length };
}

function parseSlice(s: string, i: number): { value: unknown[]; i: number } {
  const arr: unknown[] = [];
  while (i < s.length) {
    i = skipWs(s, i);
    if (s[i] === ']') return { value: arr, i: i + 1 };
    const parsed = parseSliceItem(s, i);
    arr.push(parsed.value);
    i = parsed.i;
  }
  throw new Error('Unclosed Go slice');
}

function parseMap(
  s: string,
  i: number
): { value: Record<string, unknown>; i: number } {
  const obj: Record<string, unknown> = {};
  while (i < s.length) {
    i = skipWs(s, i);
    if (s[i] === ']') return { value: obj, i: i + 1 };

    const keyStart = i;
    while (i < s.length && s[i] !== ':' && s[i] !== ']') i++;
    const key = s.slice(keyStart, i).trim();
    if (!key || s[i] !== ':') {
      throw new Error(`Expected ":" after map key near index ${i}`);
    }
    i++;

    const parsed = parseValue(s, i);
    obj[key] = parsed.value;
    i = parsed.i;
  }
  throw new Error('Unclosed Go map');
}

function parseValue(s: string, i: number): { value: unknown; i: number } {
  i = skipWs(s, i);
  if (s.startsWith('map[', i)) {
    return parseMap(s, i + 4);
  }
  if (s[i] === '[') {
    return parseSlice(s, i + 1);
  }
  return parseScalar(s, i);
}

/** Parse Go fmt %v map/slice strings from SuperPlane. */
export function parseGoFmtString(input: string): unknown {
  const s = input.trim();
  if (!s.startsWith('map[') && !s.startsWith('[')) {
    throw new Error('Not a Go map/slice string');
  }
  const { value } = parseValue(s, 0);
  return value;
}

export function tryParseGoFmtString(input: string): unknown | undefined {
  const s = input.trim();
  if (!s.startsWith('map[') && !s.startsWith('[')) {
    return undefined;
  }
  try {
    return parseGoFmtString(s);
  } catch {
    return undefined;
  }
}
