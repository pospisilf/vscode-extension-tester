import { ShellExecution, TaskScope, workspace } from 'vscode';
import { TestRunner } from './TestRunnerTask';
import * as path from 'path';

export class RunAllTestsTask extends TestRunner {
	constructor() {
		const configuration = workspace.getConfiguration('extesterRunner');
		const additionalArgs: string[] = configuration.get<string[]>('additionalArgs', []);
		const outputFolder = configuration.get<string>('outFolder') || 'out';
		const workspaceFolder = workspace.workspaceFolders?.[0]?.uri.fsPath || '';
		const outputPath = path.join(workspaceFolder, outputFolder, '**', '*.test.js');
		const vsCodeVersion = configuration.get<string>('vsCodeVersion');
		const versionArg = vsCodeVersion ? `--code_version ${vsCodeVersion}` : '';
		const vsCodeType = configuration.get<string>('vsCodeType');

		// Ensure paths with spaces are properly quoted
		const quotedOutputPath = `"${outputPath}"`;
		const quotedArgs = additionalArgs.map(arg => `"${arg}"`).join(' ');

		const shellExecution = new ShellExecution(
			`npx extest setup-and-run ${versionArg} --type ${vsCodeType} ${quotedArgs} ${quotedOutputPath}`
		);

		super(TaskScope.Workspace, 'Run All Tests', shellExecution);
	}
}
