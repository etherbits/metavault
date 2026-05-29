import { logger } from "../logger";
import type { LibraryEntryWithTags } from "./ezq.schema";

export type EzqCommandExecution = {
  action: string;
  commands: string[];
  rows: LibraryEntryWithTags[];
};

export class EzqCommandExecutor {
  async execute({ action, commands, rows }: EzqCommandExecution) {
    if (commands.length === 0) return;

    logger.info(
      {
        action,
        commands,
        rowIds: rows.map((row) => row.id),
      },
      "EZQ commands received"
    );
  }
}
