import * as vscode from 'vscode';
import { RunAllTestsTask } from '../tasks/RunAllTask';
import { RunFileTask } from '../tasks/RunFileTask';
import { Logger } from '../logger/logger';

export function registerTestCommands(context: vscode.ExtensionContext, logger: Logger) {
    context.subscriptions.push(
        vscode.commands.registerCommand('extester-runner.runAll', async () => {
            logger.info('User triggered: extester-runner.runAll');
            const task = new RunAllTestsTask();
            await task.execute();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('extester-runner.runFolder', async (item) => {
            logger.info(`User triggered: extester-runner.runFolder for folder ${item.folderPath}`);
            const task = new RunFileTask(item.folderPath);
            await task.execute();
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('extester-runner.runFile', async (item) => {
            logger.info(`User triggered: extester-runner.runFile for file ${item.filePath}`);
            const task = new RunFileTask(item.filePath);
            await task.execute();
        })
    );
}
