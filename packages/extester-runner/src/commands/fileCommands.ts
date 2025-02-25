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
import { Logger } from '../logger/logger';

export function registerFileCommands(context: vscode.ExtensionContext, logger: Logger) {
    context.subscriptions.push(
            vscode.commands.registerCommand('extesterRunner.openTestItem', async (filePath: string, lineNumber?: number) => {
                logger.info(`User triggered: extester-runner.openTestItem for filePath: ${filePath} on line ${lineNumber}`);
                if (filePath) {
                    try {
                        const document = await vscode.workspace.openTextDocument(filePath);
                        const editor = await vscode.window.showTextDocument(document);
    
                        const position =
                            lineNumber !== undefined
                                ? new vscode.Position(lineNumber - 1, 0) // convert to 0-based index
                                : new vscode.Position(0, 0);
    
                        const range = new vscode.Range(position, position);
                        editor.revealRange(range, vscode.TextEditorRevealType.InCenter); // center the line in the editor
                        editor.selection = new vscode.Selection(position, position); // set the cursor to the line
                    } catch (error) {
                        logger.error(`Failed to open file: ${error}`);
                        vscode.window.showErrorMessage(`Failed to open file: ${error}`);
                    }
                }
            }),
        );
}
