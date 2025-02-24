import * as vscode from 'vscode';
// import * as path from 'path';
import { RunAllTestsTask } from './tasks/RunAllTask';
import { RunFileTask } from './tasks/RunFileTask';
import { createLogger, Logger } from './logger/logger';
// import { parseTestFile } from './utils/parser';
// import { TestBlock } from './types/testTypes';
import { TreeItem } from './types/treeItem';
import { ExtesterTreeProvider } from './providers/extesterTreeProvider';

let logger: Logger; 

export function activate(context: vscode.ExtensionContext) {
	// Create an output channel for logging
    const outputChannel = vscode.window.createOutputChannel('ExTester Runner');
	logger = createLogger(outputChannel);
	
	logger.error('placeholder');

    logger.info('Activating ExTester Runner extension...');
	
	// register view
	const treeDataProvider = new ExtesterTreeProvider(logger);
	logger.debug('Registering tree view');
	vscode.window.registerTreeDataProvider('extesterView', treeDataProvider);

	logger.debug('Registering commands');
	// tree view commands
	// refresh
	context.subscriptions.push(
		vscode.commands.registerCommand('extester-runner.refreshTests', async () => {
			logger.info('User triggered: extester-runner.refreshTests');
			treeDataProvider.refresh();
		}),
	);

	// collapse all
	context.subscriptions.push(
		vscode.commands.registerCommand('extester-runner.collapseAll', async () => {
			logger.info('User triggered: extester-runner.collapseAll');
			vscode.commands.executeCommand('workbench.actions.treeView.extesterView.collapseAll');
		}),
	);

	// utils
	// open specific file in editor on position if defined
	context.subscriptions.push(
		vscode.commands.registerCommand('extesterRunner.openTestItem', async (filePath: string, lineNumber?: number) => {
			logger.info(`User triggered: extester-runner.openTestItem for filePath: ${filePath} on line ${lineNumber}`);
			if (filePath) {
				try {
					const document = await vscode.workspace.openTextDocument(filePath);
					const editor = await vscode.window.showTextDocument(document);

					const position =
						lineNumber !== undefined
							? new vscode.Position(lineNumber - 1, 0) // convert to 0-based index
							: new vscode.Position(0, 0);

					const range = new vscode.Range(position, position);
					editor.revealRange(range, vscode.TextEditorRevealType.InCenter); // center the line in the editor
					editor.selection = new vscode.Selection(position, position); // set the cursor to the line
				} catch (error) {
					logger.error(`Failed to open file: ${error}`);
					vscode.window.showErrorMessage(`Failed to open file: ${error}`);
				}
			}
		}),
	);

	// Run commands
	// Run all
	context.subscriptions.push(
		vscode.commands.registerCommand('extester-runner.runAll', async () => {
			logger.info('User triggered: extester-runner.runAll');
			const task = new RunAllTestsTask();
			await task.execute();
		}),
	);

	// Run folder
	context.subscriptions.push(
		vscode.commands.registerCommand('extester-runner.runFolder', async (item: TreeItem) => {
			logger.info(`User triggered: extester-runner.runFolder for folder ${item.folderPath as string}`);
			const task = new RunFileTask(item.folderPath as string);
			await task.execute();
		}),
	);

	// Run file
	context.subscriptions.push(
		vscode.commands.registerCommand('extester-runner.runFile', async (item: TreeItem) => {
			logger.info(`User triggered: extester-runner.runFolder for file ${item.filePath as string}`);
			const task = new RunFileTask(item.filePath as string);
			await task.execute();
		}),
	);

	// refresh on create, delete and change
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

	logger.info('ExTester Runner extension activated successfully.');
}

// This method is called when your extension is deactivated
export function deactivate() {
	vscode.window.createOutputChannel('ExTester Runner').dispose();
}

