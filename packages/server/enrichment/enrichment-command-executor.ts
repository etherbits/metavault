import type {
  CommandExecutionParams,
  CommandExecutionResult,
  CommandExecutor,
} from "../commands/command-executor";
import { parseCommandUnion } from "../commands/command-schema";
import { logger } from "../logger";
import { EnrichmentService } from "./enrichment.service";
import { enrichmentCommandSchemas } from "./enrichment-command.schema";
import type { EnrichmentCommand } from "./types";

export class EnrichmentCommandExecutor implements CommandExecutor {
  private readonly enrichmentService = new EnrichmentService();

  async execute(
    params: CommandExecutionParams
  ): Promise<CommandExecutionResult> {
    const command = this.parseCommand(params.command);
    if (!command) return { rows: params.rows };

    logger.info(
      {
        action: params.action,
        rawCommand: params.command,
        command,
        rowCount: params.rows.length,
      },
      "Executing enrichment command"
    );

    if (params.action === "search") {
      const result = {
        rows: await this.enrichmentService.extendResponse({
          command,
          rows: params.rows,
          userId: params.userId,
        }),
      };
      logger.info(
        {
          action: params.action,
          rawCommand: params.command,
          rowCount: result.rows.length,
        },
        "Enrichment command completed"
      );
      return result;
    }

    if (params.action === "create" || params.action === "update") {
      const result = {
        rows: await this.enrichmentService.updateEntry({
          command,
          rows: params.rows,
          userId: params.userId,
        }),
      };
      logger.info(
        {
          action: params.action,
          rawCommand: params.command,
          rowCount: result.rows.length,
        },
        "Enrichment command completed"
      );
      return result;
    }

    logger.info(
      {
        action: params.action,
        rawCommand: params.command,
        rowCount: params.rows.length,
      },
      "Enrichment command skipped for unsupported action"
    );
    return { rows: params.rows };
  }

  canExecute(command: string): boolean {
    return this.parseCommand(command) !== null;
  }

  private parseCommand(command: string): EnrichmentCommand | null {
    return parseCommandUnion(enrichmentCommandSchemas, command);
  }
}
