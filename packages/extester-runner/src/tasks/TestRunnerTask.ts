import { ShellExecution, Task, TaskDefinition, tasks, TaskScope, WorkspaceFolder } from 'vscode';

/**
 * TODO
 */
export abstract class TestRunner extends Task {

	protected label: string;

	constructor(scope: WorkspaceFolder | TaskScope.Workspace, label: string, shellExecution: ShellExecution) {

		const taskDefinition: TaskDefinition = {
			'label': label,
			'type': 'shell'
		};

		super(
			taskDefinition,
			scope,
			label,
			'extester-runner',
			shellExecution
		);
		this.label = label;
	}

	public async execute(): Promise<void> {
		await tasks.executeTask(this);
		return await this.waitForEnd();
	}

	private async waitForEnd(): Promise<void> {
		await new Promise<void>(resolve => {
			const disposable = tasks.onDidEndTask(e => {
				if (e.execution.task.name === this.label) {
					disposable.dispose();
					resolve();
				}
			});
		});
	}

}