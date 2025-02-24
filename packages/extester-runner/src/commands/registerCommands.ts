import * as vscode from 'vscode';
import { registerTestCommands } from './testCommands';
import { registerViewCommands } from './viewCommands';
import { registerFileCommands } from './fileCommands';
import { ExtesterTreeProvider } from '../providers/extesterTreeProvider';
import { Logger } from '../logger/logger';

export function registerCommands(
    context: vscode.ExtensionContext,
    treeDataProvider: ExtesterTreeProvider,
    logger: Logger
) {
    registerTestCommands(context, logger);
    registerViewCommands(context, treeDataProvider, logger);
    registerFileCommands(context, logger);
}
