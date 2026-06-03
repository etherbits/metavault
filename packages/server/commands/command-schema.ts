import { fuzzy_match } from "@etherbits/ezq-node";
import type { z } from "zod";

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
      normalized.push(fuzzy_match(rawSegment, candidates));
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
