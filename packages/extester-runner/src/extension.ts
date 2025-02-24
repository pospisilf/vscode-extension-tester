import * as vscode from 'vscode';
import { createLogger, Logger } from './logger/logger';
import { ExtesterTreeProvider } from './providers/extesterTreeProvider';
import { registerCommands } from './commands/registerCommands';
import { createFileWatcher } from './utils/fileWatcher';

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

	registerCommands(context, treeDataProvider, logger);

	createFileWatcher(context, treeDataProvider, logger);

	logger.info('ExTester Runner extension activated successfully.');
}

// This method is called when your extension is deactivated
export function deactivate() {
	vscode.window.createOutputChannel('ExTester Runner').dispose();
}

