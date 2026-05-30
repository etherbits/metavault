import { logger } from "../logger";
import type {
  CommandExecutionParams,
  CommandExecutor,
} from "./command-executor";

export class CommandDelegator {
  constructor(private readonly executors: CommandExecutor[] = []) {}

  async delegateCommands(
    commands: string[],
    params: Omit<CommandExecutionParams, "command">
  ) {
    let rows = params.rows;

    for (const command of commands) {
      const executor = this.getExecutor(command);
      if (!executor) {
        logger.info(
          {
            action: params.action,
            command,
            rowIds: rows.map((row) => row.id),
          },
          "EZQ command ignored because no executor matched"
        );
        continue;
      }

      const result = await executor.execute({
        ...params,
        command,
        rows,
      });
      rows = result.rows;
    }

    return { rows };
  }

  getExecutor(command: string): CommandExecutor | undefined {
    return this.executors.find((executor) => executor.canExecute(command));
  }
}
