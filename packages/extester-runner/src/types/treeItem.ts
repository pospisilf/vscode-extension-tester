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