import type { ASTExpr } from "@etherbits/ezq-node";
import type { LibraryEntryWithTags } from "../ezq/ezq.schema";

export type CommandExecutionParams = {
  command: string;
  action: string;
  rows: LibraryEntryWithTags[];
  userId: string | null;
  filterRowsByExpression: (
    expression: ASTExpr,
    rows: LibraryEntryWithTags[]
  ) => Promise<LibraryEntryWithTags[]>;
};

export type CommandExecutionResult = {
  rows: LibraryEntryWithTags[];
};

export interface CommandExecutor {
  canExecute(command: string): boolean;
  execute(params: CommandExecutionParams): Promise<CommandExecutionResult>;
}

export class CommandExecutionError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
  }
}
