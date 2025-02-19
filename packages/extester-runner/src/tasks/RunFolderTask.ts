import { ShellExecution, TaskScope, workspace } from 'vscode';
import { TestRunner } from './TestRunnerTask';

export class RunFolderTask extends TestRunner {
	constructor(folder: string) {
		const configuration = workspace.getConfiguration('extesterRunner');
		const additionalArgs: string[] = configuration.get<string[]>('additionalArgs', []);
		const outputFolder = configuration.get<string>('outFolder') || 'out';
		const outputPath = folder.replace(/src\//, `${outputFolder}/`) + '/**/*.test.js';
		const vsCodeVersion = configuration.get<string>('vsCodeVersion');
		const versionArg = vsCodeVersion ? `--code_version ${vsCodeVersion}` : '';
		const vsCodeType = configuration.get<string>('vsCodeType');
		const shellExecution = new ShellExecution(`npx extest setup-and-run ${versionArg} --type ${vsCodeType} ${additionalArgs.join(' ')} ${outputPath}`);
		super(TaskScope.Workspace, 'Run Test Folder', shellExecution);
	}
}
