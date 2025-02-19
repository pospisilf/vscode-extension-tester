import { ShellExecution, TaskScope, workspace } from 'vscode';
import { TestRunner } from './TestRunnerTask';

export class RunFileTask extends TestRunner {
	constructor(file: string) {
		const configuration = workspace.getConfiguration('extesterRunner');
		const additionalArgs: string[] = configuration.get<string[]>('additionalArgs', []);
		const outputFolder = configuration.get<string>('outFolder') || 'out'; // tady to out je potreba nejak poladit!!
		const outputPath = file
			.replace(/src\//, `${outputFolder}/`) // replace 'src/' with the output folder
			.replace(/\.ts$/, '.js'); // replace '.ts' with '.js'
		const vsCodeVersion = configuration.get<string>('vsCodeVersion');
		const versionArg = vsCodeVersion ? `--code_version ${vsCodeVersion}` : '';
		const vsCodeType = configuration.get<string>('vsCodeType');
		const shellExecution = new ShellExecution(`npx extest setup-and-run ${versionArg} --type ${vsCodeType} ${additionalArgs.join(' ')} ${outputPath}`);
		super(TaskScope.Workspace, 'Run Test File', shellExecution);
	}
}
