/**
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
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
import { Logger } from '../logger/logger';
import { ExtesterTreeProvider } from '../providers/extesterTreeProvider';

/**
 * Registers a settings watcher to detect configuration changes related to `extesterRunner`
 * and trigger a refresh of the view.
 *
 * This function listens for workspace configuration changes and refreshes the test explorer
 * whenever any setting under `extesterRunner` is updated. Ensures that updates to user-defined
 * settings are applied without requiring a manual reload.
 *
 * @param context - The extension context used to register disposables.
 * @param treeDataProvider - The tree data provider responsible for managing the test explorer view.
 * @param logger - Logger instance for logging configuration changes.
 */
export function settingsWatcher(context: vscode.ExtensionContext, treeDataProvider: ExtesterTreeProvider, logger: Logger) {
	context.subscriptions.push(
		vscode.workspace.onDidChangeConfiguration((event) => {
			if (event.affectsConfiguration('extesterRunner')) {
				logger.info('Setting was changed, refreshing view.');
				treeDataProvider.refresh();
			}
		}),
	);
}
