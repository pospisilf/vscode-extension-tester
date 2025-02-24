import * as vscode from 'vscode';
import { createLogger, Logger } from './logger/logger';
import { ExtesterTreeProvider } from './providers/extesterTreeProvider';
import { registerCommands } from './commands/registerCommands';

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
	registerCommands(context, treeDataProvider, logger);

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

