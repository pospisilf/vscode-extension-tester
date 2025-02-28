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
import { ShellExecution, TaskScope, workspace } from 'vscode';
import { TestRunner } from './TestRunnerTask';
import * as path from 'path';
import { Logger } from '../logger/logger';

/**
 * Task for running a single test file within the workspace.
 *
 * This task executes a specified test file by converting its TypeScript path to the
 * corresponding JavaScript file in the output folder. It retrieves necessary configurations
 * and constructs the appropriate command for execution using `extest`.
 */
export class RunFileTask extends TestRunner {
	/**
	 * Creates an instance of the `RunFileTask`.
	 *
	 * This constructor retrieves configurations, transforms the file path to match the
	 * compiled output location, and sets up the shell execution command.
	 *
	 * @param {string} file - The absolute path of the test file to be executed.
 	 * @param {Logger} logger - The logger instance for logging messages.
	 */
	constructor(file: string, logger: Logger) {

		const configuration = workspace.getConfiguration('extesterRunner');	
	
		const outputFolder = configuration.get<string>('outFolder') || 'out';
		const workspaceFolder = workspace.workspaceFolders?.[0]?.uri.fsPath;

		if (!workspaceFolder) {
			logger.error('No workspace folder found.');
			vscode.window.showErrorMessage(`No workspace folder found.`);
			throw new Error('No workspace folder found.');
		} 

		const vsCodeVersion = configuration.get<string>('vsCodeVersion');
		const versionArgs = vsCodeVersion ? ['--code_version', vsCodeVersion] : [];
		const vsCodeType = configuration.get<string>('vsCodeType');
		const typeArgs = vsCodeType ? ['--type', vsCodeType] : [];
		const additionalArgs = configuration.get<string[]>('additionalArgs', []) || [];

		const outputPath = path.join(
			workspaceFolder, 
			outputFolder, 
			path.relative(path.join(workspaceFolder, 'src'), file)
		).replace(/\.ts$/, '.js');

		logger.info(`Resolved output path: ${outputPath}`);

		const shellExecution = new ShellExecution('npx', 
			['extest',
			'setup-and-run',
			...versionArgs,
			...typeArgs,
			...additionalArgs,
			`'${outputPath}'`,
			]
		);

		logger.info(`Running command: ${shellExecution}`);

		super(TaskScope.Workspace, 'Run Test File', shellExecution, logger);
	}
}
