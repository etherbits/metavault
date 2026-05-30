import type { LibraryEntryWithTags } from "../ezq/ezq.schema";

export type CommandExecutionParams = {
  command: string;
  action: string;
  rows: LibraryEntryWithTags[];
  userId: string | null;
};

export type CommandExecutionResult = {
  rows: LibraryEntryWithTags[];
};

export interface CommandExecutor {
  canExecute(command: string): boolean;
  execute(params: CommandExecutionParams): Promise<CommandExecutionResult>;
}
