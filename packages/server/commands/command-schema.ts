import type z from "zod";

type ZodDef = {
  type?: string;
  in?: z.ZodType;
  innerType?: z.ZodType;
  items?: z.ZodType[];
  values?: unknown[];
};

type ZodSchemaWithDef = z.ZodType & {
  def?: ZodDef;
  _def?: ZodDef;
  options?: readonly string[];
  values?: Set<unknown>;
  unwrap?: () => z.ZodType;
};

export function parseCommandWithSchema<Output>(
  schema: z.ZodType<Output>,
  rawCommand: string
): Output | null {
  const normalized = normalizeCommandSegments(schema, rawCommand);
  if (!normalized) return null;

  const parsed = schema.safeParse(normalized);
  return parsed.success ? parsed.data : null;
}

export function parseCommandUnion<Output>(
  schemas: readonly z.ZodType<Output>[],
  rawCommand: string
): Output | null {
  for (const schema of schemas) {
    const parsed = parseCommandWithSchema(schema, rawCommand);
    if (parsed) return parsed;
  }

  return null;
}

export function normalizeCommandSegments(
  schema: z.ZodType,
  rawCommand: string
): unknown[] | null {
  const tupleItems = getTupleItems(schema);
  if (!tupleItems) return null;

  const rawSegments = rawCommand.split(":");
  if (rawSegments.length > tupleItems.length) return null;

  const normalized: unknown[] = [];
  for (const [index, segmentSchema] of tupleItems.entries()) {
    const rawSegment = rawSegments[index];

    if (rawSegment === undefined || rawSegment === "") {
      normalized.push(undefined);
      continue;
    }

    const candidates = getFuzzyCandidates(segmentSchema);
    if (!candidates) {
      normalized.push(rawSegment);
      continue;
    }

    try {
      normalized.push(fuzzyMatch(rawSegment, candidates));
    } catch {
      return null;
    }
  }

  return normalized;
}

export function getFuzzyCandidates(schema: z.ZodType): string[] | null {
  const unwrapped = unwrapCommandSegmentSchema(schema) as ZodSchemaWithDef;
  const def = getDef(unwrapped);

  if (def?.type === "literal") {
    return getLiteralCandidates(unwrapped, def);
  }

  if (def?.type === "enum") {
    return getEnumCandidates(unwrapped);
  }

  return null;
}

export function unwrapCommandSegmentSchema(schema: z.ZodType): z.ZodType {
  let current = schema as ZodSchemaWithDef;

  while (true) {
    const def = getDef(current);
    if (def?.type !== "optional" && def?.type !== "default") {
      return current;
    }

    const next = current.unwrap?.() ?? def.innerType ?? current;

    if (!next || next === current) {
      return current;
    }

    current = next;
  }
}

function getTupleItems(schema: z.ZodType): z.ZodType[] | null {
  const tupleSchema = unwrapCommandSchema(schema) as ZodSchemaWithDef;
  const def = getDef(tupleSchema);

  if (def?.type !== "tuple" || !Array.isArray(def.items)) {
    return null;
  }

  return def.items;
}

function unwrapCommandSchema(schema: z.ZodType): z.ZodType {
  const commandSchema = schema as ZodSchemaWithDef;
  const def = getDef(commandSchema);
  if (def?.type === "pipe" && def.in) {
    return def.in;
  }

  return schema;
}

function getEnumCandidates(schema: ZodSchemaWithDef) {
  if (Array.isArray(schema.options) && schema.options.length > 0) {
    return [...schema.options];
  }

  return null;
}

function getLiteralCandidates(schema: ZodSchemaWithDef, def: ZodDef) {
  const [value] = [...(schema.values ?? def.values ?? [])];

  return typeof value === "string" ? [value] : null;
}

function getDef(schema: ZodSchemaWithDef) {
  return schema.def ?? schema._def;
}

function fuzzyMatch(input: string, candidates: readonly string[]): string {
  const normalizedInput = normalizeFuzzyText(input);
  let best: { candidate: string; score: number } | null = null;

  for (const candidate of candidates) {
    const score = scoreFuzzyCandidate(
      normalizedInput,
      normalizeFuzzyText(candidate)
    );

    if (!best || score > best.score) {
      best = { candidate, score };
    }
  }

  if (!best || best.score < 0.6) {
    throw new Error(`No confident fuzzy match for ${input}`);
  }

  return best.candidate;
}

function scoreFuzzyCandidate(input: string, candidate: string) {
  if (!input || !candidate) return 0;
  if (input === candidate) return 1;
  if (candidate.startsWith(input)) return 0.9;
  if (input === getAcronym(candidate)) return 0.85;

  return scoreSubsequence(input, candidate);
}

function scoreSubsequence(input: string, candidate: string) {
  let searchIndex = 0;
  let firstMatch = -1;
  let lastMatch = -1;
  let currentRun = 0;
  let longestRun = 0;

  for (const character of input) {
    const matchIndex = candidate.indexOf(character, searchIndex);
    if (matchIndex === -1) return 0;

    if (firstMatch === -1) firstMatch = matchIndex;
    currentRun = matchIndex === lastMatch + 1 ? currentRun + 1 : 1;
    longestRun = Math.max(longestRun, currentRun);
    lastMatch = matchIndex;
    searchIndex = matchIndex + 1;
  }

  const span = lastMatch - firstMatch + 1;
  const coverage = input.length / candidate.length;
  const tightness = input.length / span;
  const startBonus = firstMatch === 0 ? 0.15 : 0;
  const runBonus = (longestRun / input.length) * 0.15;

  return coverage * 0.45 + tightness * 0.4 + startBonus + runBonus;
}

function normalizeFuzzyText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getAcronym(value: string) {
  return value
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("");
}
