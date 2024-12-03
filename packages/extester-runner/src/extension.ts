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

  // runner commands
  context.subscriptions.push(
    vscode.commands.registerCommand('extester-runner.runFolder', async (item: TreeItem) => {
      vscode.window.showInformationMessage(`Running tests in folder: ${item.folderPath}`);
      await runFolder(item.folderPath as string);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extester-runner.runFile', async (item: TreeItem) => {
      vscode.window.showInformationMessage(`Running tests in file: ${item.filePath}`);
      await runFile(item.filePath as string);
    })
  );

  // file save event: trigger tree view refresh
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {
      // check if the saved file matches test files pattern
      const configuration = vscode.workspace.getConfiguration('extesterRunner');
      const testFileGlob = configuration.get<string>('testFileGlob') || '**/*.test.ts';
      if (vscode.workspace.workspaceFolders) {
        const workspaceFolder = vscode.workspace.workspaceFolders[0];
        const relativePath = vscode.workspace.asRelativePath(document.uri.fsPath);
        // use a simple match to check if file is a test file
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
            const document = await vscode.workspace.openTextDocument(filePath); // open the file
            const editor = await vscode.window.showTextDocument(document); // show the file in the editor
            // if a line number is specified, move the cursor there
            if (lineNumber !== undefined) {
              const position = new vscode.Position(lineNumber - 1, 0); // convert to 0-based index
              const range = new vscode.Range(position, position);
              editor.revealRange(range, vscode.TextEditorRevealType.InCenter); // center the line in the editor
              editor.selection = new vscode.Selection(position, position); // set the cursor to the line
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
    plugins: ["typescript"], // handle TypeScript-specific syntax
  });

  const testStructure: TestBlock[] = []; // root structure
  const stack: TestBlock[] = []; // stack for managing nesting

  traverse(ast, {
    CallExpression(path) {
      const callee = path.node.callee;
      let functionName: string | undefined = undefined;
      let modifier: string | null = null;

      // identify function name and modifier (e.g., `describe`, `it.skip`)
      if (t.isIdentifier(callee)) {
        functionName = callee.name;
      } else if (t.isMemberExpression(callee)) {
        const object = callee.object;
        const property = callee.property;
        if (t.isIdentifier(object) && t.isIdentifier(property)) {
          functionName = object.name;
          modifier = property.name; // handle `.skip`, `.only`, etc.
        }
      }

      // get line of occurrence
      const line = path.node.loc?.start.line || 0;

      // handle `describe` blocks
      if (functionName === "describe") {
        const describeArg = path.node.arguments[0];
        const describeName = t.isStringLiteral(describeArg)
          ? describeArg.value
          : "Unnamed Describe";

        // TODO: add modifier (skip, only) handling
        const newDescribeBlock: TestBlock = {
          describe: describeName,
          line: line, // add line number
          its: [],
          children: [],
        };

        // add to parent block's children or root structure
        if (stack.length > 0) {
          const parent = stack[stack.length - 1];
          parent.children.push(newDescribeBlock);
        } else {
          testStructure.push(newDescribeBlock);
        }

        stack.push(newDescribeBlock); // push current block to stack
        return; // skip further processing in this CallExpression for now
      }

      // handle `it` blocks
      if (functionName === "it") {
        const itArg = path.node.arguments[0];
        const itName = t.isStringLiteral(itArg) ? itArg.value : "Unnamed It";

        const itBlock = {
          name: itName,
          modifier: modifier, // add modifier (skip, only)
          line: line, // add line number
        };

        // add to the `its` array of the current `describe` block
        if (stack.length > 0) {
          const currentDescribe = stack[stack.length - 1];
          currentDescribe.its.push(itBlock);
        }
      }
    },

    // check exit condition for `describe` blocks
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
          stack.pop(); // pop the current `describe` block from the stack
        }
      }
    },
  });

  return testStructure;
}


class ExtesterTreeProvider implements vscode.TreeDataProvider<TreeItem> {
  // event emitter to signal when the tree data needs to be refreshed
  private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | undefined | void> =
    new vscode.EventEmitter<TreeItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<TreeItem | undefined | void> =
    this._onDidChangeTreeData.event;

  private files: vscode.Uri[] = []; // stores test files found in the workspace
  private parsedFiles: Map<string, TestBlock[]> = new Map(); // cache for parsed file contents

  constructor() {
    this.refresh(); // load initial data
  }

  // trigger a refresh of the tree view
  refresh(): void {
    this.parsedFiles.clear();
    this._onDidChangeTreeData.fire(); // notify VS Code to update the tree
    this.findTestFiles(); // search for test files in the workspace
  }

  // get a tree item to render in the tree view
  getTreeItem(element: TreeItem): vscode.TreeItem {
    return element;
  }

  // get children for a given tree item
  async getChildren(element?: TreeItem): Promise<TreeItem[]> {
    if (!element) {
      // return top-level folders
      const folderMap = this.groupFilesByFolder();

      return Array.from(folderMap.keys()).map(
        (folder) => {
          const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
          const folderPath = path.join(workspaceFolder, folder);
          console.log("folder path" + folderPath);
          return new TreeItem(folder, vscode.TreeItemCollapsibleState.Collapsed, true, undefined, undefined, folderPath);
        }
      );

    } else if (element.isFolder && typeof element.label === 'string') {
      // return files inside a folder
      const folderMap = this.groupFilesByFolder();
      const files = folderMap.get(element.label) || [];
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
      return files.map(
        (file) =>
          new TreeItem(
            file,
            vscode.TreeItemCollapsibleState.Collapsed,
            false,
            path.join(workspaceFolder, element.label as string, file) // pass the file path
          )
      );

    } else if (!element.isFolder && element.filePath) {
      // parse the file content and build the tree structure
      const parsedContent = await this.getParsedContent(element.filePath);
      return this.convertTestBlocksToTreeItems(parsedContent);
    } else if (element.children) {
      // if the element has children, return them
      return element.children;
    }

    return []; // return an empty list by default
  }

  // find test files in the workspace
  private async findTestFiles(): Promise<void> {
    try {
      // search for files matching the pattern '**/*.test.ts', excluding node_modules
      // get settings or use the default
      const configuration = vscode.workspace.getConfiguration('extesterRunner');
      const testFileGlob = configuration.get<string>('testFileGlob') || '**/*.test.ts';
      const excludeGlob = configuration.get<string>('excludeGlob') || '**/node_modules/**';

      // use the settings in findFiles
      const files = await vscode.workspace.findFiles(testFileGlob, excludeGlob);
      this.files = files; // store the found files
      this._onDidChangeTreeData.fire(); // notify the tree view to refresh
    } catch (error) {
      // handle any errors that occur during file search
      if (error instanceof Error) {
        vscode.window.showErrorMessage(`Error finding test files: ${error.message}`);
      } else {
        vscode.window.showErrorMessage(`Unknown error occurred while finding test files.`);
      }
    }
  }

  // group files by their parent folder
  private groupFilesByFolder(): Map<string, string[]> {
    const folderMap = new Map<string, string[]>();
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';

    // iterate through each file and organize them by folder
    this.files.forEach((fileUri) => {
      const relativePath = path.relative(workspaceFolder, fileUri.fsPath); // get relative path
      const folder = path.dirname(relativePath); // extract folder name
      const fileName = path.basename(relativePath); // extract file name

      if (!folderMap.has(folder)) {
        folderMap.set(folder, []);
      }
      folderMap.get(folder)?.push(fileName); // add file to the corresponding folder
    });

    return folderMap; // return the folder-to-files mapping
  }

  // get parsed content for a file, using a cache to avoid reparsing
  private async getParsedContent(filePath: string): Promise<TestBlock[]> {
    if (this.parsedFiles.has(filePath)) {
      return this.parsedFiles.get(filePath) || []; // return cached result if available
    }

    try {
      // parse the file content and store it in the cache
      const uri = vscode.Uri.file(filePath);
      const parsedContent = await parseTestFile(uri);
      this.parsedFiles.set(filePath, parsedContent);

      // log the parsed content to verify -> debug purpose
      console.log(`Parsed content for file: ${filePath}`);
      console.log(JSON.stringify(parsedContent, null, 2));

      return parsedContent;
    } catch (error) {
      // handle any errors during parsing
      vscode.window.showErrorMessage(`Error parsing file ${filePath}: ${error}`);
      return [];
    }
  }

  private convertTestBlocksToTreeItems(testBlocks: TestBlock[]): TreeItem[] {
    return testBlocks.map((block) => {
      // create a TreeItem for the `describe` block
      const describeItem = new TreeItem(
        block.describe,
        vscode.TreeItemCollapsibleState.Collapsed,
        false,
        undefined, // no file path for `describe`
        block.line // pass the line number
      );

      // describe parameters in tree view
      describeItem.tooltip = 'describe';
      describeItem.contextValue = 'describeBlock';
      describeItem.iconPath = new vscode.ThemeIcon('bracket');

      // create TreeItems for `its` inside this `describe` block
      const itItems = block.its.map((it) => {
        const itItem = new TreeItem(
          `${it.name} ${it.modifier ? `[${it.modifier}]` : ''}`,
          vscode.TreeItemCollapsibleState.None,
          false,
          undefined, // no file path for `it`
          it.line // pass the line number
        );

        // it parameters in tree view
        itItem.tooltip = 'it';
        itItem.contextValue = 'itBlock';
        itItem.iconPath = new vscode.ThemeIcon('variable');

        return itItem;
      });

      // recursively process nested `describe` blocks
      const nestedDescribeItems = this.convertTestBlocksToTreeItems(block.children);

      // attach all child items (both `it` blocks and nested `describe` blocks)
      describeItem.children = [...itItems, ...nestedDescribeItems];

      return describeItem; // return the fully built TreeItem
    });
  }

}

class TreeItem extends vscode.TreeItem {
  children: TreeItem[] | undefined;
  public lineNumber?: number;
  public folderPath?: string; // new folderPath property

  constructor(
    label: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    public isFolder: boolean,
    public filePath?: string,
    lineNumber?: number,
    folderPath?: string
  ) {
    super(label, collapsibleState);
    this.lineNumber = lineNumber;
    this.folderPath = folderPath;

    this.iconPath = isFolder
      ? new vscode.ThemeIcon('folder')
      : new vscode.ThemeIcon('file');

    this.contextValue = isFolder ? 'folder' : 'file';

    if (!isFolder && filePath) {
      this.command = {
        command: 'extesterRunner.openTestItem',
        title: 'Open Test Item',
        arguments: [this.filePath],
      };
    }
  }
}

async function runAllTests() {
  const configuration = vscode.workspace.getConfiguration('extesterRunner');
  const outputFolder = configuration.get<string>('outFolder') || 'out';
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
  const outputPath = `${workspaceFolder}/${outputFolder}/**/*.test.js`;

  vscode.window.showInformationMessage('Running all tests...');

  // find an existing terminal or create a new one
  let terminal = vscode.window.terminals.find(t => t.name === 'UI Test Runner');
  if (!terminal) {
    terminal = vscode.window.createTerminal({
      name: 'UI Test Runner', // name of the terminal
    });
  }

  // focus the terminal and send the command with the modified path
  terminal.show();
  terminal.sendText(`npx extest setup-and-run ${outputPath}`);
}


async function runFolder(folder: string) {
  const configuration = vscode.workspace.getConfiguration('extesterRunner');
  const outputFolder = configuration.get<string>('outFolder') || 'out';
  const outputPath = folder.replace(/src\//, `${outputFolder}/`) + '/**/*.test.js';

  vscode.window.showInformationMessage(`Running ${outputFolder}`);

  let terminal = vscode.window.terminals.find(t => t.name === 'UI Test Runner');
  if (!terminal) {
    terminal = vscode.window.createTerminal({
      name: 'UI Test Runner', // name of the terminal
    });
  }

  terminal.show();
  terminal.sendText(`npx extest setup-and-run ${outputPath}`);
}

function runFile(file: string) {
  const configuration = vscode.workspace.getConfiguration('extesterRunner');
  const outputFolder = configuration.get<string>('outFolder') || 'out/**.*.js';

  // transform the input path to match the output folder and file structure
  const outputPath = file
    .replace(/src\//, `${outputFolder}/`) // replace 'src/' with the output folder
    .replace(/\.ts$/, '.js'); // replace '.ts' with '.js'

    vscode.window.showInformationMessage(`Running ${outputPath}`);

  let terminal = vscode.window.terminals.find(t => t.name === 'UI Test Runner');
  if (!terminal) {
    terminal = vscode.window.createTerminal({
      name: 'UI Test Runner', // name of the terminal
    });
  }

  terminal.show();
  terminal.sendText(`npx extest setup-and-run ${outputPath}`);
}

