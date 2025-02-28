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
 * Task for running all test files within a specified folder.
 *
 * This task executes all test files located within a given folder by converting the
 * folder path to match the compiled output structure. It retrieves necessary configurations
 * and constructs the appropriate command for execution using `extest`.
 */
export class RunFolderTask extends TestRunner {
	/**
	 * Creates an instance of the `RunFolderTask`.
	 *
	 * This constructor retrieves configurations, transforms the folder path to match the
	 * compiled output structure, and sets up the shell execution command.
	 *
	 * @param {string} folder - The absolute path of the folder containing test files.
	 * @param {Logger} logger - The logger instance for logging messages.
	 */
	constructor(folder: string, logger: Logger) {

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
		const testFileGlob = configuration.get<string>('testFileGlob') || '**/ui-tests/**/*.test.ts';
		
		const outputPath = path.join(
			workspaceFolder, 
			outputFolder, 
			path.relative(path.join(workspaceFolder, 'src'), folder)
		);
		const outputFilePattern = (testFileGlob?.split('/').pop() || testFileGlob).replace(/\.ts$/, '.js');
		const fullOutputPath = path.join(outputPath, outputFilePattern);
	
		logger.info(`Resolved output path: ${fullOutputPath}`);

		const shellExecution = new ShellExecution('npx', 
			['extest',
			'setup-and-run',
			...versionArgs,
			...typeArgs,
			...additionalArgs,
			`'${fullOutputPath}'`,
			]
		);

		logger.info(`Running command: ${shellExecution}`);

		super(TaskScope.Workspace, 'Run Test Folder', shellExecution, logger);
	}
}
