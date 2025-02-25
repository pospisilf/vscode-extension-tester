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

import { ShellExecution, Task, TaskDefinition, tasks, TaskScope, WorkspaceFolder } from 'vscode';

/**
 * Abstract base class for test execution tasks.
 * 
 * This class extends VS Code's `Task` and provides a standardized way to execute 
 * test-related tasks using a shell command. It includes an automatic mechanism to wait 
 * for task completion before proceeding.
 * 
 * Subclasses should implement specific test execution logic while inheriting 
 * the task execution and tracking behavior.
 */
export abstract class TestRunner extends Task {

	protected label: string;
	
	/**
     * Creates an instance of the `TestRunner` task.
     * 
     * @param {WorkspaceFolder | TaskScope.Workspace} scope - The scope in which the task runs.
     * @param {string} label - The name of the task.
     * @param {ShellExecution} shellExecution - The shell command to execute for the task.
     */
	constructor(scope: WorkspaceFolder | TaskScope.Workspace, label: string, shellExecution: ShellExecution) {
		const taskDefinition: TaskDefinition = {
			label: label,
			type: 'shell',
		};

		super(taskDefinition, scope, label, 'extester-runner', shellExecution);
		this.label = label;
		this.presentationOptions.clear = true; // clean terminal output before each execution
	}
	
	/**
	 * Executes the test task asynchronously.
     * This method starts the task execution and waits for its completion before returning.
     * 
     * @returns {Promise<void>} Resolves when the task has completed.
     */
	public async execute(): Promise<void> {
		await tasks.executeTask(this);
		return await this.waitForEnd();
	}

	/**
     * Waits for the task to complete before resolving the promise.
     * 
     * This method listens for the `onDidEndTask` event and resolves once the task 
     * matching this instance's label has completed.
     * 
     * @returns {Promise<void>} Resolves when the task execution ends.
     */
	private async waitForEnd(): Promise<void> {
		await new Promise<void>((resolve) => {
			const disposable = tasks.onDidEndTask((e) => {
				if (e.execution.task.name === this.label) {
					disposable.dispose();
					resolve();
				}
			});
		});
	}
}
