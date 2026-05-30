import type {
  CommandExecutionParams,
  CommandExecutionResult,
  CommandExecutor,
} from "../commands/command-executor";
import { EnrichmentService } from "./enrichment.service";
import { enrichmentCommandSchema } from "./enrichment-command.schema";
import type { EnrichmentCommand } from "./types";

export class EnrichmentCommandExecutor implements CommandExecutor {
  private readonly enrichmentService = new EnrichmentService();

  async execute(
    params: CommandExecutionParams
  ): Promise<CommandExecutionResult> {
    const command = this.parseCommand(params.command);
    if (!command) return { rows: params.rows };

    if (params.action === "search") {
      return {
        rows: await this.enrichmentService.extendResponse({
          command,
          rows: params.rows,
          userId: params.userId,
        }),
      };
    }

    if (params.action === "create" || params.action === "update") {
      return {
        rows: await this.enrichmentService.updateEntry({
          command,
          rows: params.rows,
          userId: params.userId,
        }),
      };
    }

    return { rows: params.rows };
  }

  canExecute(command: string): boolean {
    return enrichmentCommandSchema.safeParse(command.split(":")).success;
  }

  private parseCommand(command: string): EnrichmentCommand | null {
    const parsed = enrichmentCommandSchema.safeParse(command.split(":"));
    if (!parsed.success) return null;

    return parsed.data;
  }
}
