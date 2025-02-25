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

// TreeItem
export class TreeItem extends vscode.TreeItem {
    children: TreeItem[] | undefined;
    public lineNumber?: number;
    public folderPath?: string; // new folderPath property

    constructor(
        label: string,
        collapsibleState: vscode.TreeItemCollapsibleState,
        public isFolder: boolean,
        public filePath?: string,
        lineNumber?: number,
        folderPath?: string,
    ) {
        super(label, collapsibleState);
        this.lineNumber = lineNumber;
        this.folderPath = folderPath;

        this.iconPath = isFolder ? new vscode.ThemeIcon('folder') : new vscode.ThemeIcon('file');

        this.contextValue = isFolder ? 'folder' : 'file';

        this.tooltip = isFolder ? folderPath : filePath;

        // if it's file then you can open it
        if (!isFolder && filePath) {
            this.command = {
                command: 'extesterRunner.openTestItem',
                title: 'Open Test Item',
                arguments: [this.filePath, this.lineNumber],
            };
        }
    }
}