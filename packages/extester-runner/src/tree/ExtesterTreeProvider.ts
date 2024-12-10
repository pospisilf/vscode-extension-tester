import * as vscode from 'vscode';
import * as path from 'path';
import { TreeItem } from './TreeItem';
import * as fs from 'fs/promises';

export class ExtesterTreeProvider implements vscode.TreeDataProvider<TreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | undefined | void> =
    new vscode.EventEmitter<TreeItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<TreeItem | undefined | void> =
    this._onDidChangeTreeData.event;

  private files: vscode.Uri[] = [];
  private parsedContent: Map<string, TestNode[]> = new Map();

  constructor() {
    this.refresh();
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
    this.findTestFiles();
  }

  getTreeItem(element: TreeItem): vscode.TreeItem {
    return element;
  }

     
  async getChildren(element?: TreeItem): Promise<TreeItem[]> {
    if (!element) {
        // Top-level folders
        const folderMap = this.groupFilesByFolder();
        return Array.from(folderMap.keys()).map(
            (folder) =>
                new TreeItem(folder, vscode.TreeItemCollapsibleState.Collapsed, true)
        );
    } else if (element.isFolder) {
        // Files in a folder
        const folderLabel = this.getTreeItemLabelAsString(element.label);
        const folderMap = this.groupFilesByFolder();
        const files = folderMap.get(folderLabel) || [];
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder is open.');
            return [];
        }

        return files.map(
            (file) =>
                new TreeItem(
                    file,
                    vscode.TreeItemCollapsibleState.Collapsed,
                    false,
                    path.join(workspaceFolder, folderLabel, file)
                )
        );
    } else if (!element.isFolder) {
        const filePath = element.filePath;

        if (!filePath) {
            vscode.window.showErrorMessage('File path is undefined.');
            return [];
        }

        // Handle nested describes or test cases
        const content = this.parsedContent.get(filePath) || [];
        const labelString = this.getTreeItemLabelAsString(element.label);

        // If the label corresponds to a describe, find its children
        const node = labelString ? this.findNodeByLabel(content, labelString) : null;

        if (node?.children) {
            return this.createTreeItemsFromTestNodes(node.children, filePath);
        }

        // If no node matches, return the top-level tests
        return this.createTreeItemsFromTestNodes(content, filePath);
    }

    return [];
}

/**
 * Creates TreeItems from hierarchical test nodes.
 */
private createTreeItemsFromTestNodes(nodes: TestNode[], filePath: string): TreeItem[] {
    return nodes.map((node) => {
        const collapsibleState = node.children?.length
            ? vscode.TreeItemCollapsibleState.Collapsed
            : vscode.TreeItemCollapsibleState.None;

        return new TreeItem(
            node.label,
            collapsibleState,
            false,
            filePath,
            node.line
        );
    });
}

/**
 * Finds a node by its label in a tree of TestNode objects.
 */
private findNodeByLabel(nodes: TestNode[], label: string): TestNode | undefined {
    for (const node of nodes) {
        if (node.label === label) {
            return node;
        }
        if (node.children) {
            const childNode = this.findNodeByLabel(node.children, label);
            if (childNode) {
                return childNode;
            }
        }
    }
    return undefined;
}

/**
 * Extracts a `TreeItem` label as a string.
 * Handles `string`, `TreeItemLabel`, and `undefined` cases.
 */
private getTreeItemLabelAsString(label: string | vscode.TreeItemLabel | undefined): string {
    if (typeof label === 'string') {
        return label;
    } else if (label && typeof label.label === 'string') {
        return label.label;
    }
    return ''; // Empty string for undefined or invalid labels
}



  private async findTestFiles(): Promise<void> {
    try {
        const configuration = vscode.workspace.getConfiguration('extesterRunner');
        const testFileGlob = configuration.get<string>('testFileGlob') || '**/*.test.ts';
        const excludeGlob = configuration.get<string>('excludeGlob') || '**/node_modules/**';

        const files = await vscode.workspace.findFiles(testFileGlob, excludeGlob);
        this.files = files;
        this.parsedContent.clear();

        await Promise.all(
            files.map(async (fileUri) => {
                const filePath = fileUri.fsPath;
                const treeContent = await this.parseFile(filePath); // New structure
                this.parsedContent.set(filePath, treeContent); // Use the new structure
            })
        );

        this._onDidChangeTreeData.fire();
    } catch (error) {
        if (error instanceof Error) {
            vscode.window.showErrorMessage(`Error finding test files: ${error.message}`);
        } else {
            vscode.window.showErrorMessage(`Unknown error occurred while finding test files.`);
        }
    }
}



  private async parseFile(filePath: string): Promise<{ label: string; children?: any[] }[]> {
    try {
        const fileContent = await fs.readFile(filePath, 'utf8');
        const describeOrItRegex = /(describe|it)\(['"](.*?)['"]\s*,/g;

        const lines = fileContent.split('\n');

        // Stack to maintain the current hierarchy
        const stack: { label: string; children?: any[] }[] = [];
        let root: { label: string; children?: any[] }[] = [];

        lines.forEach((line) => {
            let match;
            while ((match = describeOrItRegex.exec(line)) !== null) {
                const [_, type, label] = match;

                if (type === 'describe') {
                    const node = { label, children: [] };
                    if (stack.length === 0) {
                        // Root describe
                        root.push(node);
                    } else {
                        // Nested describe
                        stack[stack.length - 1].children?.push(node);
                    }
                    stack.push(node);
                } else if (type === 'it') {
                    const node = { label };
                    if (stack.length === 0) {
                        // Root-level it (unusual but possible)
                        root.push(node);
                    } else {
                        // it belongs to the current describe
                        stack[stack.length - 1].children?.push(node);
                    }
                }

                // Handle ending blocks by detecting `});`
                if (line.trim() === '});') {
                    stack.pop();
                }
            }
        });

        return root;
    } catch (error) {
        vscode.window.showErrorMessage(`Error parsing file ${filePath}: ${error}`);
        return [];
    }
}


  private groupFilesByFolder(): Map<string, string[]> {
    const folderMap = new Map<string, string[]>();
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';

    this.files.forEach((fileUri) => {
      const relativePath = path.relative(workspaceFolder, fileUri.fsPath);
      const folder = path.dirname(relativePath);
      const fileName = path.basename(relativePath);

      if (!folderMap.has(folder)) {
        folderMap.set(folder, []);
      }
      folderMap.get(folder)?.push(fileName);
    });

    return folderMap;
  }
}

interface TestNode {
    label: string;
    line?: number; // Optional, used for leaf nodes (e.g., `it` blocks)
    children?: TestNode[];
}
