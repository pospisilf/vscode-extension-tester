import { ShellExecution, TaskScope, workspace } from 'vscode';
import { TestRunner } from './TestRunnerTask';
import * as path from 'path';

export class RunFileTask extends TestRunner {
	constructor(file: string) {
		const configuration = workspace.getConfiguration('extesterRunner');
		const additionalArgs: string[] = configuration.get<string[]>('additionalArgs', []);
		const outputFolder = configuration.get<string>('outFolder') || 'out'; // Make 'out' path configurable
		const workspaceFolder = workspace.workspaceFolders?.[0]?.uri.fsPath || '';

		// Convert file path to the correct output path
		const relativePath = path.relative(workspaceFolder, file);
		const outputPath = path.join(outputFolder, relativePath)
			.replace(new RegExp(`\\b${path.sep}?src${path.sep}`, 'g'), `${outputFolder}${path.sep}`) // Replace 'src/' correctly
			.replace(/\.ts$/, '.js'); // Convert '.ts' to '.js'

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

		super(TaskScope.Workspace, 'Run Test File', shellExecution);
	}
}
