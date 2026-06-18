import { generate_ast } from "@etherbits/ezq-node";
import { z } from "zod";
import type {
  CommandExecutionParams,
  CommandExecutor,
} from "../commands/command-executor";
import { CommandExecutionError } from "../commands/command-executor";
import { parseCommandWithSchema } from "../commands/command-schema";
import { aliasMappingModel } from "./alias.model";
import { aliasNameSchema } from "./alias.schema";

const aliasCommandSchema = z
  .tuple([z.literal("alias"), aliasNameSchema])
  .transform(([, alias]) => ({ alias }));

export class AliasCommandExecutor implements CommandExecutor {
  canExecute(command: string): boolean {
    return this.parseCommand(command) !== null;
  }

  async execute(params: CommandExecutionParams) {
    const command = this.parseCommand(params.command);
    if (!command) return { rows: params.rows };

    if (!params.userId) {
      throw new CommandExecutionError(
        401,
        "Alias command requires an authenticated user"
      );
    }

    const mapping = await aliasMappingModel.getByUserAndAlias(
      params.userId,
      command.alias
    );
    if (!mapping) {
      throw new CommandExecutionError(
        404,
        `Alias mapping not found: ${command.alias}`
      );
    }

    let ast: ReturnType<typeof generate_ast>;
    try {
      ast = generate_ast(`/search ${mapping.expansion}`);
    } catch {
      throw new CommandExecutionError(
        400,
        `Alias mapping contains invalid EZQ: ${command.alias}`
      );
    }

    if (!("Root" in ast)) {
      throw new CommandExecutionError(
        400,
        `Alias mapping did not produce a query: ${command.alias}`
      );
    }

    return {
      rows: await params.filterRowsByExpression(
        ast.Root.expression,
        params.rows
      ),
    };
  }

  private parseCommand(command: string) {
    return parseCommandWithSchema(aliasCommandSchema, command);
  }
}
