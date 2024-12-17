import * as vscode from 'vscode';
import * as path from 'path';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';

export function activate(context: vscode.ExtensionContext) {
  const treeDataProvider = new ExtesterTreeProvider();
  vscode.window.registerTreeDataProvider('extesterView', treeDataProvider);

  // top level buttons
  context.subscriptions.push(
    vscode.commands.registerCommand('extester-runner.refreshTests', () => {
      treeDataProvider.refresh();
    })
  );

  // test runners
  context.subscriptions.push(
    vscode.commands.registerCommand('extester-runner.runAll', async () => {
      vscode.window.showInformationMessage('Running all tests...');
      await runAllTests();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extester-runner.runFolder', async (item: TreeItem) => {
      vscode.window.showInformationMessage(`Running tests in folder: ${item.label}`);
      await runFolder(item.label as string);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extester-runner.runFile', async (item: TreeItem) => {
      vscode.window.showInformationMessage(`Running tests in file: ${item.filePath}`);
      await runFile(item.filePath as string);
    })
  );

    // File save event: Trigger tree view refresh
    context.subscriptions.push(
      vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {
        // Check if the saved file matches test files pattern
        const configuration = vscode.workspace.getConfiguration('extesterRunner');
        const testFileGlob = configuration.get<string>('testFileGlob') || '**/*.test.ts';
        if (vscode.workspace.workspaceFolders) {
          const workspaceFolder = vscode.workspace.workspaceFolders[0];
          const relativePath = vscode.workspace.asRelativePath(document.uri.fsPath);
          // Use a simple match to check if file is a test file
          if (vscode.workspace.getConfiguration().get('files.eol')) { // EOL-based refresh
            treeDataProvider.refresh();
          } 
        }
      })
    );

  // commands
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'extesterRunner.openTestItem',
      async (filePath: string, lineNumber?: number) => {
        if (filePath) {
          try {
            const document = await vscode.workspace.openTextDocument(filePath); // Open the file
            const editor = await vscode.window.showTextDocument(document); // Show the file in the editor

            // If a line number is specified, move the cursor there
            if (lineNumber !== undefined) {
              const position = new vscode.Position(lineNumber - 1, 0); // Convert to 0-based index
              const range = new vscode.Range(position, position);
              editor.revealRange(range, vscode.TextEditorRevealType.InCenter); // Center the line in the editor
              editor.selection = new vscode.Selection(position, position); // Set the cursor to the line
            }
          } catch (error) {
            vscode.window.showErrorMessage(`Failed to open file: ${error}`);
          }
        }
      }
    )
  );
}

export function deactivate() { }

interface TestBlock {
  describe: string;
  line: number;
  its: { name: string; modifier: string | null; line: number }[];
  children: TestBlock[];
}

export async function parseTestFile(uri: vscode.Uri): Promise<TestBlock[]> {
  const document = await vscode.workspace.openTextDocument(uri);
  const content = document.getText();

  const ast = parse(content, {
    sourceType: "module",
    plugins: ["typescript"], // Handle TypeScript-specific syntax
  });

  const testStructure: TestBlock[] = []; // Root structure
  const stack: TestBlock[] = []; // Stack for managing nesting

  traverse(ast, {
    CallExpression(path) {
      const callee = path.node.callee;
      let functionName: string | undefined = undefined;
      let modifier: string | null = null;

      // Identify function name and modifier (e.g., `describe`, `it.skip`)
      if (t.isIdentifier(callee)) {
        functionName = callee.name;
      } else if (t.isMemberExpression(callee)) {
        const object = callee.object;
        const property = callee.property;
        if (t.isIdentifier(object) && t.isIdentifier(property)) {
          functionName = object.name;
          modifier = property.name; // Handle `.skip`, `.only`, etc.
        }
      }

      // Get line of occurrence
      const line = path.node.loc?.start.line || 0;

      // Handle `describe` blocks
      if (functionName === "describe") {
        const describeArg = path.node.arguments[0];
        const describeName = t.isStringLiteral(describeArg)
          ? describeArg.value
          : "Unnamed Describe";

        const newDescribeBlock: TestBlock = {
          describe: describeName,
          line: line, // Add line number
          its: [],
          children: [],
        };

        // Add to parent block's children or root structure
        if (stack.length > 0) {
          const parent = stack[stack.length - 1];
          parent.children.push(newDescribeBlock);
        } else {
          testStructure.push(newDescribeBlock);
        }

        stack.push(newDescribeBlock); // Push current block to stack
        return; // Skip further processing in this CallExpression for now
      }

      // Handle `it` blocks
      if (functionName === "it") {
        const itArg = path.node.arguments[0];
        const itName = t.isStringLiteral(itArg) ? itArg.value : "Unnamed It";

        const itBlock = {
          name: itName,
          modifier: modifier,
          line: line, // Add line number
        };

        // Add to the `its` array of the current `describe` block
        if (stack.length > 0) {
          const currentDescribe = stack[stack.length - 1];
          currentDescribe.its.push(itBlock);
        }
      }
    },

    // Check exit condition for `describe` blocks
    exit(path) {
      if (path.isCallExpression()) {
        const callee = path.node.callee;
        let functionName: string | undefined = undefined;

        if (t.isIdentifier(callee)) {
          functionName = callee.name;
        } else if (t.isMemberExpression(callee)) {
          const object = callee.object;
          if (t.isIdentifier(object)) {
            functionName = object.name;
          }
        }

        if (functionName === "describe") {
          stack.pop(); // Pop the current `describe` block from the stack
        }
      }
    },
  });

  return testStructure;
}


class ExtesterTreeProvider implements vscode.TreeDataProvider<TreeItem> {
  // Event emitter to signal when the tree data needs to be refreshed
  private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | undefined | void> =
    new vscode.EventEmitter<TreeItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<TreeItem | undefined | void> =
    this._onDidChangeTreeData.event;

  private files: vscode.Uri[] = []; // Stores test files found in the workspace
  private parsedFiles: Map<string, TestBlock[]> = new Map(); // Cache for parsed file contents

  constructor() {
    this.refresh(); // Load initial data
  }

  // Trigger a refresh of the tree view
  refresh(): void {
    this.parsedFiles.clear(); 
    this._onDidChangeTreeData.fire(); // Notify VS Code to update the tree
    this.findTestFiles(); // Search for test files in the workspace
  }

  // Get a tree item to render in the tree view
  getTreeItem(element: TreeItem): vscode.TreeItem {
    return element;
  }

  // Get children for a given tree item
  async getChildren(element?: TreeItem): Promise<TreeItem[]> {
    if (!element) {
      // Return top-level folders
      const folderMap = this.groupFilesByFolder();
      return Array.from(folderMap.keys()).map(
        (folder) =>
          new TreeItem(folder, vscode.TreeItemCollapsibleState.Collapsed, true)
      );
    } else if (element.isFolder && typeof element.label === 'string') {
      // Return files inside a folder
      const folderMap = this.groupFilesByFolder();
      const files = folderMap.get(element.label) || [];
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
      return files.map(
        (file) =>
          new TreeItem(
            file,
            vscode.TreeItemCollapsibleState.Collapsed,
            false,
            path.join(workspaceFolder, element.label as string, file) // Pass the file path
          )
      );

    } else if (!element.isFolder && element.filePath) {
      // Parse the file content and build the tree structure
      const parsedContent = await this.getParsedContent(element.filePath);
      return this.convertTestBlocksToTreeItems(parsedContent);
    } else if (element.children) {
      // If the element has children, return them
      return element.children;
    }

    return []; // Return an empty list by default
  }

  // Find test files in the workspace
  private async findTestFiles(): Promise<void> {
    try {
      // Search for files matching the pattern '**/*.test.ts', excluding node_modules
      // Get settings or use the default
      const configuration = vscode.workspace.getConfiguration('extesterRunner');
      const testFileGlob = configuration.get<string>('testFileGlob') || '**/*.test.ts';
      const excludeGlob = configuration.get<string>('excludeGlob') || '**/node_modules/**';

      // Use the settings in findFiles
      const files = await vscode.workspace.findFiles(testFileGlob, excludeGlob);


      this.files = files; // Store the found files
      this._onDidChangeTreeData.fire(); // Notify the tree view to refresh
    } catch (error) {
      // Handle any errors that occur during file search
      if (error instanceof Error) {
        vscode.window.showErrorMessage(`Error finding test files: ${error.message}`);
      } else {
        vscode.window.showErrorMessage(`Unknown error occurred while finding test files.`);
      }
    }
  }

  // Group files by their parent folder
  private groupFilesByFolder(): Map<string, string[]> {
    const folderMap = new Map<string, string[]>();
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';

    // Iterate through each file and organize them by folder
    this.files.forEach((fileUri) => {
      const relativePath = path.relative(workspaceFolder, fileUri.fsPath); // Get relative path
      const folder = path.dirname(relativePath); // Extract folder name
      const fileName = path.basename(relativePath); // Extract file name

      if (!folderMap.has(folder)) {
        folderMap.set(folder, []);
      }
      folderMap.get(folder)?.push(fileName); // Add file to the corresponding folder
    });

    return folderMap; // Return the folder-to-files mapping
  }

  // Get parsed content for a file, using a cache to avoid reparsing
  private async getParsedContent(filePath: string): Promise<TestBlock[]> {
    if (this.parsedFiles.has(filePath)) {
      return this.parsedFiles.get(filePath) || []; // Return cached result if available
    }

    try {
      // Parse the file content and store it in the cache
      const uri = vscode.Uri.file(filePath);
      const parsedContent = await parseTestFile(uri);
      this.parsedFiles.set(filePath, parsedContent);

      // Log the parsed content to verify -> debug purpose
      console.log(`Parsed content for file: ${filePath}`);
      console.log(JSON.stringify(parsedContent, null, 2));

      return parsedContent;
    } catch (error) {
      // Handle any errors during parsing
      vscode.window.showErrorMessage(`Error parsing file ${filePath}: ${error}`);
      return [];
    }
  }

  private convertTestBlocksToTreeItems(testBlocks: TestBlock[]): TreeItem[] {
    return testBlocks.map((block) => {
      // Create a TreeItem for the `describe` block
      const describeItem = new TreeItem(
        block.describe,
        vscode.TreeItemCollapsibleState.Collapsed,
        false,
        undefined, // No file path for `describe`
        block.line // Pass the line number
      );

      // describe parameters in tree view
      describeItem.tooltip = 'describe';
      describeItem.contextValue = 'describeBlock';
      describeItem.iconPath = new vscode.ThemeIcon('bracket');

      // Create TreeItems for `its` inside this `describe` block
      const itItems = block.its.map((it) => {
        const itItem = new TreeItem(
          `it: ${it.name} ${it.modifier ? `[${it.modifier}]` : ''}`, // zobrazeni it v treeiview
          vscode.TreeItemCollapsibleState.None,
          false,
          undefined, // No file path for `it`
          it.line // Pass the line number
        );

        // it parameters in tree view
        itItem.tooltip = 'it';
        itItem.contextValue = 'itBlock';
        itItem.iconPath = new vscode.ThemeIcon('variable');

        return itItem;
      });

      // Recursively process nested `describe` blocks
      const nestedDescribeItems = this.convertTestBlocksToTreeItems(block.children);

      // Attach all child items (both `it` blocks and nested `describe` blocks)
      describeItem.children = [...itItems, ...nestedDescribeItems];

      return describeItem; // Return the fully built TreeItem
    });
  }

}

class TreeItem extends vscode.TreeItem {
  children: TreeItem[] | undefined; // Optional property to store child items
  public lineNumber?: number; // Line number for navigation

  constructor(
    label: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    public isFolder: boolean,
    public filePath?: string,
    lineNumber?: number // Add line number parameter
  ) {
    super(label, collapsibleState);
    this.lineNumber = lineNumber; // Assign the line number

    // Set icons for folders or files
    this.iconPath = isFolder
      ? new vscode.ThemeIcon('folder')
      : new vscode.ThemeIcon('file');

    this.contextValue = isFolder ? 'folder' : 'file';

    // Add a command to open the file when clicked (if it's a file or test block)
    if (!isFolder && filePath) {
      this.command = {
        command: 'extesterRunner.openTestItem', // Command to open the file
        title: 'Open Test Item',
        arguments: [this.filePath], // Pass the file path to the command
      };
    }
  }
}

async function runAllTests() {
  const configuration = vscode.workspace.getConfiguration('extesterRunner');
  const testFileGlob = configuration.get<string>('testFileGlob') || '**/*.test.ts';

  vscode.window.showInformationMessage('To be done -> runAllTests()');
   // Find an existing terminal or create a new one
   let terminal = vscode.window.terminals.find(t => t.name === 'UI Test Runner');
   if (!terminal) {
     terminal = vscode.window.createTerminal({
       name: 'UI Test Runner', // Name of the terminal
     });
   }
   // Focus the terminal and send the command
   terminal.show();
   terminal.sendText(`npx extest setup-and-run ${testFileGlob}`);
   
}

async function runFolder(folder: string) {

  vscode.window.showInformationMessage('To be done -> runAllTests()');
   // Find an existing terminal or create a new one
   let terminal = vscode.window.terminals.find(t => t.name === 'UI Test Runner');
   if (!terminal) {
     terminal = vscode.window.createTerminal({
       name: 'UI Test Runner', // Name of the terminal
     });
   }
   // Focus the terminal and send the command
   terminal.show();
   terminal.sendText(`npx extest setup-and-run ${folder}`);

  // vscode.window.showInformationMessage(`To be done -> runFolder()`);
}
function runFile(file: string) {
  vscode.window.showInformationMessage(`To be done -> runFile()`);
     // Find an existing terminal or create a new one
     let terminal = vscode.window.terminals.find(t => t.name === 'UI Test Runner');
     if (!terminal) {
       terminal = vscode.window.createTerminal({
         name: 'UI Test Runner', // Name of the terminal
       });
     }
     // Focus the terminal and send the command
     terminal.show();
     terminal.sendText(`npx extest setup-and-run ${file}`);
}
