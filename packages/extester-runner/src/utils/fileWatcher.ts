import * as vscode from 'vscode';
import { Logger } from '../logger/logger';
import { ExtesterTreeProvider } from '../providers/extesterTreeProvider';

export function createFileWatcher(context: vscode.ExtensionContext, treeDataProvider: ExtesterTreeProvider, logger: Logger) {
    logger.debug('Creating file system watcher');

    const watcher = vscode.workspace.createFileSystemWatcher('**/*');

    watcher.onDidCreate((uri) => {
        logger.info(`File created: ${uri.fsPath}`);
        treeDataProvider.refresh();
    });

    watcher.onDidDelete((uri) => {
        logger.info(`File deleted: ${uri.fsPath}`);
        treeDataProvider.refresh();
    });

    watcher.onDidChange((uri) => {
        logger.info(`File changed: ${uri.fsPath}`);
        treeDataProvider.refresh();
    });

    context.subscriptions.push(watcher);
}
