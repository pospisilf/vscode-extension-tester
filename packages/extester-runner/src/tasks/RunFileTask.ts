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
        const shellExecution = new ShellExecution(`npx extest setup-and-run ${outputPath} ${additionalArgs.join(' ')}`);
        super(TaskScope.Workspace, 'Run Test File', shellExecution);
    }
}
