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
import { ExtesterTreeProvider } from '../providers/extesterTreeProvider';

export function createFileWatcher(context: vscode.ExtensionContext, treeDataProvider: ExtesterTreeProvider, logger: Logger) {
    logger.debug('Creating file system watcher');

    const watcher = vscode.workspace.createFileSystemWatcher('**/*');

    watcher.onDidCreate((uri) => {
        logger.info(`File created: ${uri.fsPath}`);
        treeDataProvider.refresh();
    });

    watcher.onDidDelete((uri) => {
        logger.info(`File deleted: ${uri.fsPath}`);
        treeDataProvider.refresh();
    });

    watcher.onDidChange((uri) => {
        logger.info(`File changed: ${uri.fsPath}`);
        treeDataProvider.refresh();
    });

    context.subscriptions.push(watcher);
}
