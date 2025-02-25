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
import { RunAllTestsTask } from '../tasks/RunAllTask';
import { RunFileTask } from '../tasks/RunFileTask';
import { Logger } from '../logger/logger';

export function registerTestCommands(context: vscode.ExtensionContext, logger: Logger) {
    context.subscriptions.push(
        vscode.commands.registerCommand('extester-runner.runAll', async () => {
            logger.info('User triggered: extester-runner.runAll');
            const task = new RunAllTestsTask();
            await task.execute();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('extester-runner.runFolder', async (item) => {
            logger.info(`User triggered: extester-runner.runFolder for folder ${item.folderPath}`);
            const task = new RunFileTask(item.folderPath);
            await task.execute();
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('extester-runner.runFile', async (item) => {
            logger.info(`User triggered: extester-runner.runFile for file ${item.filePath}`);
            const task = new RunFileTask(item.filePath);
            await task.execute();
        })
    );
}
