import * as vscode from 'vscode';
import * as path from 'path';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import { RunAllTestsTask } from './tasks/RunAllTask';
import { RunFileTask } from './tasks/RunFileTask';

export function activate(context: vscode.ExtensionContext) {

	// register view
	const treeDataProvider = new ExtesterTreeProvider();
	vscode.window.registerTreeDataProvider('extesterView', treeDataProvider);

	// tree view commands
	// refresh
	context.subscriptions.push(
		vscode.commands.registerCommand('extester-runner.refreshTests', async () => {
			treeDataProvider.refresh();
		})
	);

	// collapse all
	context.subscriptions.push(
		vscode.commands.registerCommand('extester-runner.collapseAll', async () => {
			vscode.commands.executeCommand('workbench.actions.treeView.extesterView.collapseAll');
		})
	);

	// search files
	context.subscriptions.push(
		vscode.commands.registerCommand('extester-runner.searchFiles', async () => {
			const searchQuery = await vscode.window.showInputBox({
				placeHolder: 'Search for a file or folder...',
				prompt: 'Type to search files or folders in the tree view',
			});

			treeDataProvider.setSearchQuery(searchQuery); // Pass the query to the TreeDataProvider
		})
	);

	// utils
	// open specific file in editor on position if defined
	context.subscriptions.push(
		vscode.commands.registerCommand(
			'extesterRunner.openTestItem',
			async (filePath: string, lineNumber?: number) => {
				if (filePath) {
					try {
						const document = await vscode.workspace.openTextDocument(filePath);
						const editor = await vscode.window.showTextDocument(document);

						const position = lineNumber !== undefined
							? new vscode.Position(lineNumber - 1, 0) // convert to 0-based index
							: new vscode.Position(0, 0);

						const range = new vscode.Range(position, position);
						editor.revealRange(range, vscode.TextEditorRevealType.InCenter); // center the line in the editor
						editor.selection = new vscode.Selection(position, position); // set the cursor to the line
					} catch (error) {
						vscode.window.showErrorMessage(`Failed to open file: ${error}`);
					}
				}
			}
		)
	);

	// refresh on create, delete and change
	const watcher = vscode.workspace.createFileSystemWatcher("**/*");

	watcher.onDidCreate((uri) => {
		console.log(`File created: ${uri.fsPath}`);
		treeDataProvider.refresh();
	});

	watcher.onDidDelete((uri) => {
		console.log(`File deleted: ${uri.fsPath}`);
		treeDataProvider.refresh();
	});

	watcher.onDidChange((uri) => {
		console.log(`File changed: ${uri.fsPath}`);
		treeDataProvider.refresh();
	});

	context.subscriptions.push(watcher);


	// Run commands
	// Run all
	context.subscriptions.push(
		vscode.commands.registerCommand('extester-runner.runAll', async () => {
			const task = new RunAllTestsTask();
			await task.execute();
		})
	);

	// Run folder
	context.subscriptions.push(
		vscode.commands.registerCommand('extester-runner.runFolder', async (item: TreeItem) => {
			const task = new RunFileTask(item.folderPath as string);
			await task.execute();
		})
	);

	// Run file
	context.subscriptions.push(
		vscode.commands.registerCommand('extester-runner.runFile', async (item: TreeItem) => {
			const task = new RunFileTask(item.filePath as string);
			await task.execute();
		})
	);
}

// This method is called when your extension is deactivated
export function deactivate() {

}

// Test Block
interface TestBlock {
	describe: string;
	filePath: string;
	line: number;
	modifier?: string | null; // skip/only
	parentModifier?: string | null; // skip/only
	its: ItBlock[];
	children: TestBlock[];
}

interface ItBlock {
	name: string;
	filePath: string;
	line: number;
	modifier?: string | null; // skip/only
	parentModifier?: string | null; // skip/only
	describeModifier?: string | null;
}

// TreeItem
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

		this.tooltip = isFolder ? folderPath : filePath;

		if (!isFolder && filePath) {
			this.command = {
				command: 'extesterRunner.openTestItem',
				title: 'Open Test Item',
				arguments: [this.filePath, this.lineNumber],
			};
		}
	}
}

class ExtesterTreeProvider implements vscode.TreeDataProvider<TreeItem> {
	// event emitter to signal when the tree data needs to be refreshed
	private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | undefined | void> =
		new vscode.EventEmitter<TreeItem | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<TreeItem | undefined | void> =
		this._onDidChangeTreeData.event;

	private files: vscode.Uri[] = []; // stores test files found in the workspace
	private parsedFiles: Map<string, TestBlock[]> = new Map(); // cache for parsed file contents
	private searchQuery: string | undefined; // Store the current search query

	constructor() {
		this.refresh(); // load initial data
	}

	// trigger a refresh of the tree view
	refresh(): void {
		this.parsedFiles.clear();
		this._onDidChangeTreeData.fire(); // notify VS Code to update the tree
		this.findTestFiles(); // search for test files in the workspace
	}

	// Set the search query and refresh the tree view
	setSearchQuery(query: string | undefined): void {
		this.searchQuery = query;
		this.refresh();
	}

	// get a tree item to render in the tree view
	getTreeItem(element: TreeItem): vscode.TreeItem {
		return element;
	}

	// get children for a given tree item
	async getChildren(element?: TreeItem): Promise<TreeItem[]> {
		if (!element) {
			// Return top-level folders
			const folderMap = this.groupFilesByFolder();
			const query = this.searchQuery || ''; // Provide a default value for searchQuery
			let folders = Array.from(folderMap.keys()).map((folder) => {
				const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
				const folderPath = path.join(workspaceFolder, folder);

				const configuration = vscode.workspace.getConfiguration('extesterRunner');
				const ignorePathPart = configuration.get<string>('ignorePathPart') || '';
				const displayName = folder.startsWith(ignorePathPart) ? folder.substring(ignorePathPart.length) : folder;

				const treeItem = new TreeItem(displayName, vscode.TreeItemCollapsibleState.Collapsed, true, undefined, undefined, folderPath);

    			treeItem.id = folder; // store the actual folder name for lookup
				return treeItem;
			});

			// Apply search filter to folders
			folders = folders.filter((folder) => {
				const label = typeof folder.label === 'string' ? folder.label : folder.label?.label;
				return label?.toLowerCase().includes(query.toLowerCase());
			});

			// Sort folders alphabetically
			return folders.sort((a, b) => {
				const labelA = typeof a.label === 'string' ? a.label : a.label?.label || '';
				const labelB = typeof b.label === 'string' ? b.label : b.label?.label || '';
				return labelA.localeCompare(labelB);
			});

		} else if (element.isFolder && typeof element.label === 'string') {
			// Return files inside a folder
			const actualFolderName = element.id || element.label; // if display name is not same
			const folderMap = this.groupFilesByFolder();
			const files = folderMap.get(actualFolderName) || [];
			const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
			const query = this.searchQuery || ''; // Provide a default value for searchQuery
			let fileItems = files.map((file) =>
				new TreeItem(
					file,
					vscode.TreeItemCollapsibleState.Collapsed,
					false,
					path.join(workspaceFolder, actualFolderName, file)
				)
			);

			// Apply search filter to files
			fileItems = fileItems.filter((fileItem) => {
				const label = typeof fileItem.label === 'string' ? fileItem.label : fileItem.label?.label;
				return label?.toLowerCase().includes(query.toLowerCase());
			});

			// Sort files alphabetically
			return fileItems.sort((a, b) => {
				const labelA = typeof a.label === 'string' ? a.label : a.label?.label || '';
				const labelB = typeof b.label === 'string' ? b.label : b.label?.label || '';
				return labelA.localeCompare(labelB);
			});
		} else if (!element.isFolder && element.filePath) {
			const parsedContent = await this.getParsedContent(element.filePath);
			return this.convertTestBlocksToTreeItems(parsedContent);
		} else if (element.children) {
			return element.children;
		}

		return [];
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
			let describeIcon;

			const getThemeIcon = (modifier?: string) => {
				return modifier === 'only'
					? new vscode.ThemeIcon('bracket-dot', new vscode.ThemeColor('extesterrunner.only'))
					: new vscode.ThemeIcon('bracket-error', new vscode.ThemeColor('extesterrunner.skip'));
			};

			const modifier = block.modifier ?? undefined;
			const parentModifier = block.parentModifier ?? undefined;
			
			if (modifier || parentModifier) {
				describeIcon = modifier ? getThemeIcon(modifier) : getThemeIcon(parentModifier);
			} else {
				describeIcon = new vscode.ThemeIcon('bracket');
			}
			
			// create a TreeItem for the `describe` block
			const describeItem = new TreeItem(
				`${block.describe} ${block.modifier ? `[${block.modifier}]` : ''}`,
				vscode.TreeItemCollapsibleState.Collapsed,
				false,
				undefined, // no file path for `describe` -> if provided, parser will end up in parsing same describe forever! TODO: find out WHY
				block.line // pass the line number
			);

			// describe parameters in tree view
			describeItem.tooltip = 'describe';
			describeItem.contextValue = 'describeBlock';
			describeItem.iconPath = describeIcon;

			describeItem.command = {
				command: 'extesterRunner.openTestItem',
				title: 'Open Test Item',
				arguments: [block.filePath, block.line],
			};

			// create TreeItems for `its` inside this `describe` block
			const itItems = block.its.map((it) => {
				let itIcon;
				
				const getItIcon = (modifier?: string) => {
					return modifier === 'only'
						? new vscode.ThemeIcon('variable', new vscode.ThemeColor('extesterrunner.only'))
						: new vscode.ThemeIcon('variable', new vscode.ThemeColor('extesterrunner.skip'));
				};

				const modifier = it.modifier ?? undefined;
				const parentModifier = it.parentModifier ?? undefined;
				
				itIcon = modifier || parentModifier ? getItIcon(modifier ?? parentModifier) : new vscode.ThemeIcon('bracket');
			
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
				itItem.iconPath = itIcon;

				itItem.command = {
					command: 'extesterRunner.openTestItem',
					title: 'Open Test Item',
					arguments: [it.filePath, it.line],
				};

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

				const lastElement = stack.length > 0 ? stack[stack.length - 1] : null;
				let parentDescribeModifier;

				// Assign modifier, prioritizing the element's own modifier over its parent's
				parentDescribeModifier = lastElement?.modifier ?? lastElement?.parentModifier;

				const newDescribeBlock: TestBlock = {
					describe: describeName,
					filePath: uri.fsPath, // maybe this could be handled differently?
					line: line,
					its: [],
					children: [], // nested describes
					modifier: modifier,
					parentModifier: parentDescribeModifier
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

				const lastElement = stack.length > 0 ? stack[stack.length - 1] : null;
				let parentDescribeModifier;		
		
				// Assign modifier, prioritizing the element's own modifier over its parent's
				parentDescribeModifier = lastElement?.modifier ?? lastElement?.parentModifier;

				const itBlock = {
					name: itName,
					filePath: uri.fsPath, // maybe this could be handled differently?
					modifier: modifier,
					parentModifier: parentDescribeModifier,
					line: line,
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
