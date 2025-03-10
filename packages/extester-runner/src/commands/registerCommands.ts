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
import { registerTestCommands } from './testCommands';
import { registerViewCommands } from './viewCommands';
import { registerFileCommands } from './fileCommands';
import { ExtesterTreeProvider } from '../providers/extesterTreeProvider';
import { Logger } from '../logger/logger';
import { settingsWatcher } from '../utils/settingsWatcher';
import { ScreenshotsTreeProvider } from '../providers/screenshotsTreeProvider';
import { LogsTreeProvider } from '../providers/logsTreeProvider';
import { registerScreenshotsCommands } from './screenshotsCommands';
import { registerLogsCommands } from './logsCommands';

/**
 * Registers all extension commands within the VS Code extension.
 *
 * This function initializes and registers commands related to:
 * - Testing (via `testCommands`)
 * - View Management (via `viewCommands`)
 * - File Operations (via `fileCommands`)
 *
 * @param {vscode.ExtensionContext} context - The extension context, used for registering commands.
 * @param {ExtesterTreeProvider} treeDataProvider - The tree data provider for managing extension views.
 * @param {Logger} logger - The logging utility for debugging and error tracking.
 */
export function registerCommands(context: vscode.ExtensionContext, treeDataProvider: ExtesterTreeProvider, screenshotsDataProvider: ScreenshotsTreeProvider, logsDataProvider: LogsTreeProvider, logger: Logger) {
	logger.debug('Registering commands.');
	registerTestCommands(context, logger);
	registerViewCommands(context, treeDataProvider, logger);
	registerFileCommands(context, logger);
	registerScreenshotsCommands(context, screenshotsDataProvider, logger);
	registerLogsCommands(context, logsDataProvider, logger);
	settingsWatcher(context, treeDataProvider, screenshotsDataProvider, logsDataProvider, logger);
}
