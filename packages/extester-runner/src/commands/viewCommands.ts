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
import { ExtesterTreeProvider } from '../providers/extesterTreeProvider';
import { Logger } from '../logger/logger';

/**
 * Registers view-related commands for the VS Code extension.
 *
 * This function registers commands for refreshing the test tree view and collapsing all items
 * in the ExTester view, allowing users to better manage test results.
 *
 * @param {vscode.ExtensionContext} context - The extension context, used for registering commands.
 * @param {ExtesterTreeProvider} treeDataProvider - The tree data provider responsible for managing the test view.
 * @param {Logger} logger - The logging utility for debugging and tracking command execution.
 */
export function registerViewCommands(context: vscode.ExtensionContext, treeDataProvider: ExtesterTreeProvider, logger: Logger) {
	/**
	 * Registers the `extester-runner.refreshTests` command.
	 * This command refreshes the test tree view by triggering an update on the tree data provider.
	 */
	context.subscriptions.push(
		vscode.commands.registerCommand('extester-runner.refreshTests', async () => {
			logger.debug('User triggered: extester-runner.refreshTests');
			treeDataProvider.refresh();
		}),
	);
	/**
	 * Registers the `extester-runner.collapseAll` command.
	 * This command collapses all items in the ExTester test view to improve navigation.
	 */
	context.subscriptions.push(
		vscode.commands.registerCommand('extester-runner.collapseAll', async () => {
			logger.debug('User triggered: extester-runner.collapseAll.');
			vscode.commands.executeCommand('workbench.actions.treeView.extesterView.collapseAll');
		}),
	);
}
