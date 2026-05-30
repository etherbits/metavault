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
      logger.info(
        {
          action: params.action,
          command,
          rowCount: rows.length,
        },
        "Delegating command"
      );

      const executor = this.getExecutor(command);
      if (!executor) {
        logger.info(
          {
            action: params.action,
            command,
            rowCount: rows.length,
          },
          "Command skipped because no executor matched"
        );
        continue;
      }

      logger.info(
        {
          action: params.action,
          command,
          executor: executor.constructor.name,
          rowCount: rows.length,
        },
        "Command executor selected"
      );

      const result = await executor.execute({
        ...params,
        command,
        rows,
      });
      rows = result.rows;

      logger.info(
        {
          action: params.action,
          command,
          executor: executor.constructor.name,
          rowCount: rows.length,
        },
        "Command delegation completed"
      );
    }

    return { rows };
  }

  getExecutor(command: string): CommandExecutor | undefined {
    return this.executors.find((executor) => executor.canExecute(command));
  }
}
