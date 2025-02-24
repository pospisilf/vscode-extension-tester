import * as vscode from 'vscode';
import { ExtesterTreeProvider } from '../providers/extesterTreeProvider';
import { Logger } from '../logger/logger';

export function registerViewCommands(
    context: vscode.ExtensionContext,
    treeDataProvider: ExtesterTreeProvider,
    logger: Logger
) {
    context.subscriptions.push(
        vscode.commands.registerCommand('extester-runner.refreshTests', async () => {
            logger.info('User triggered: extester-runner.refreshTests');
            treeDataProvider.refresh();
        }),
    );
    
    context.subscriptions.push(
        vscode.commands.registerCommand('extester-runner.collapseAll', async () => {
            logger.info('User triggered: extester-runner.collapseAll');
            vscode.commands.executeCommand('workbench.actions.treeView.extesterView.collapseAll');
        })
    );
}
