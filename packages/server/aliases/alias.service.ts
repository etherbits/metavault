import { generate_ast } from "@etherbits/ezq-node";
import { err, ok, type Result } from "../utils/result";
import { aliasMappingModel, type AliasMappingRow } from "./alias.model";
import type { AliasMapping, UpsertAliasMappingInput } from "./alias.schema";

class AliasMappingService {
  async getMappings(userId: string): Promise<Result<AliasMapping[]>> {
    const rows = await aliasMappingModel.getByUser(userId);
    return ok(rows.map(toAliasMapping));
  }

  async upsertMapping({
    userId,
    body,
  }: {
    userId: string;
    body: UpsertAliasMappingInput;
  }): Promise<Result<AliasMapping>> {
    if (hasCommandTokens(body.expansion)) {
      return err(400, "Alias expansions cannot contain commands");
    }

    const row = await aliasMappingModel.upsert({
      userId,
      alias: body.alias,
      expansion: body.expansion,
    });

    return ok(toAliasMapping(row));
  }

  async deleteMapping({
    userId,
    alias,
  }: {
    userId: string;
    alias: string;
  }): Promise<Result<{ alias: string }>> {
    const deleted = await aliasMappingModel.delete(userId, alias);
    if (!deleted) {
      return err(404, "Alias mapping not found");
    }

    return ok({ alias });
  }
}

function hasCommandTokens(expansion: string) {
  try {
    const ast = generate_ast(`/search ${expansion}`);
    return "Root" in ast && (ast.Root.commands?.length ?? 0) > 0;
  } catch {
    return false;
  }
}

function toAliasMapping(row: AliasMappingRow): AliasMapping {
  return {
    id: row.id,
    alias: row.alias,
    expansion: row.expansion,
  };
}

export const aliasMappingService = new AliasMappingService();
