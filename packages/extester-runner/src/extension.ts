/**
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License", destination); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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

