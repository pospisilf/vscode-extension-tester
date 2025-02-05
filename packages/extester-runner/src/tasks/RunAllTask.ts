import { ShellExecution, TaskScope, workspace } from 'vscode';
import { TestRunner } from './TestRunnerTask';

export class RunAllTestsTask extends TestRunner {
    constructor() {
        const configuration = workspace.getConfiguration('extesterRunner');
        const additionalArgs: string[] = configuration.get<string[]>('additionalArgs', []);
        const outputFolder = configuration.get<string>('outFolder') || 'out'; // tady to out je potreba nejak poladit! 
        const workspaceFolder = workspace.workspaceFolders?.[0]?.uri.fsPath || '';
        const outputPath = `${workspaceFolder}/${outputFolder}/**/*.test.js`;

        const shellExecution = new ShellExecution(`npx extest setup-and-run ${outputPath} ${additionalArgs.join(' ')}`);
        super(TaskScope.Workspace, 'Run All Tests', shellExecution);
    }
}
