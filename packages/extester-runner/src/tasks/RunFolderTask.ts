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

import { ShellExecution, TaskScope, workspace } from 'vscode';
import { TestRunner } from './TestRunnerTask';
import * as path from 'path';

export class RunFolderTask extends TestRunner {
	constructor(folder: string) {
		const configuration = workspace.getConfiguration('extesterRunner');
		const additionalArgs: string[] = configuration.get<string[]>('additionalArgs', []);
		const outputFolder = configuration.get<string>('outFolder') || 'out';
		const workspaceFolder = workspace.workspaceFolders?.[0]?.uri.fsPath || '';

		// Convert folder path to the correct output path
		const relativePath = path.relative(workspaceFolder, folder);
		const outputPath = path.join(outputFolder, relativePath, '**', '*.test.js')
			.replace(new RegExp(`\\b${path.sep}?src${path.sep}`, 'g'), `${outputFolder}${path.sep}`); // Replace 'src/' correctly

		const vsCodeVersion = configuration.get<string>('vsCodeVersion');
		const versionArg = vsCodeVersion ? `--code_version ${vsCodeVersion}` : '';
		const vsCodeType = configuration.get<string>('vsCodeType');

		// Ensure paths with spaces are properly quoted
		const escapeQuotes = (arg: string) => `"${arg.replace(/"/g, '\\"')}"`;
		const quotedOutputPath = escapeQuotes(outputPath);
		const quotedArgs = additionalArgs.map(escapeQuotes).join(' ');

		const shellExecution = new ShellExecution(
			`npx extest setup-and-run ${versionArg} --type ${vsCodeType} ${quotedArgs} ${quotedOutputPath}`
		);

		super(TaskScope.Workspace, 'Run Test Folder', shellExecution);
	}
}
