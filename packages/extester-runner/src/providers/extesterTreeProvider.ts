
import * as vscode from 'vscode';
import * as path from 'path';
import { parseTestFile } from '../utils/parser';
import { TestBlock } from '../types/testTypes';
import { TreeItem } from '../types/treeItem';
import { Logger } from '../logger/logger';

export class ExtesterTreeProvider implements vscode.TreeDataProvider<TreeItem> {
	// event emitter to signal when the tree data needs to be refreshed
	private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | undefined | void> = new vscode.EventEmitter<TreeItem | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<TreeItem | undefined | void> = this._onDidChangeTreeData.event;

	private files: vscode.Uri[] = []; // stores test files found in the workspace
	private parsedFiles: Map<string, TestBlock[]> = new Map(); // cache for parsed file contents
	private hasTestFiles: boolean = false; // flag to track if any test files are found

    private logger: Logger;

	constructor(logger: Logger) {
        this.logger = logger;
		this.refresh(); // load initial data
	}

	// trigger a refresh of the tree view
	async refresh(): Promise<void> {
		this.logger.debug('Refreshing test tree...');
		this.parsedFiles.clear();
		this.files = []; // Reset file list

		await this.findTestFiles(); // search for test files in the workspace
		
		console.log(`Setting context extesterRunner.hasTestFiles = ${this.hasTestFiles}`); // Debugging
		await vscode.commands.executeCommand('setContext', 'extesterRunner.hasTestFiles', this.hasTestFiles);
	
		this._onDidChangeTreeData.fire(); // Refresh UI
	
		// Force UI update after a slight delay to ensure state is applied
		setTimeout(() => {
			vscode.commands.executeCommand('setContext', 'extesterRunner.hasTestFiles', this.hasTestFiles);
		}, 100);
	}
	// get a tree item to render in the tree view
	getTreeItem(element: TreeItem): vscode.TreeItem {
		return element;
	}

	// get children for a given tree item
	async getChildren(element?: TreeItem): Promise<TreeItem[]> {
		if (!element) {

			if (!this.hasTestFiles) {
				// No test files found, show a placeholder message
				const noFilesItem = new TreeItem("No test files found", vscode.TreeItemCollapsibleState.None, false);
				noFilesItem.contextValue = "noFiles"; // Custom context to disable actions
				noFilesItem.iconPath = new vscode.ThemeIcon("warning");
				return [noFilesItem];
			}

			// Return top-level folders
			const folderMap = this.groupFilesByFolder();
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

			let fileItems = await Promise.all(files.map(async (file) => {
				const filePath = path.join(workspaceFolder, actualFolderName, file);
				const parsedContent = await this.getParsedContent(filePath);
		
				return new TreeItem(
					file,
					parsedContent.length > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None, // Only expandable if it has content
					false,
					filePath
				);
			}));

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
			this.logger.debug('Finding test files.');
			// search for files matching the pattern '**/*.test.ts', excluding node_modules
			// get settings or use the default
			const configuration = vscode.workspace.getConfiguration('extesterRunner');
			const testFileGlob = configuration.get<string>('testFileGlob') || '**/*.test.ts';
			const excludeGlob = configuration.get<string>('excludeGlob') || '**/node_modules/**';

			// use the settings in findFiles
			const files = await vscode.workspace.findFiles(testFileGlob, excludeGlob);
			this.files = files; // Store the found files

			console.log(`Found test files: ${this.files.length}`); // Debugging

			this.hasTestFiles = this.files.length > 0; // Ensure `hasTestFiles` is updated
	
			// Only refresh the tree after updating the state
			this._onDidChangeTreeData.fire();
		} catch (error) {
			// handle any errors that occur during file search
			if (error instanceof Error) {
				this.logger.error(`Error finding test files: ${error.message}`);
				vscode.window.showErrorMessage(`Error finding test files: ${error.message}`);
			} else {
				this.logger.error(`Unknown error occurred while finding test files.`);
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
			this.logger.debug(`Parsing file ${filePath}`);
			// parse the file content and store it in the cache
			const uri = vscode.Uri.file(filePath);
			const parsedContent = await parseTestFile(uri, this.logger);
			this.parsedFiles.set(filePath, parsedContent);
			return parsedContent;
		} catch (error) {
			// handle any errors during parsing
			this.logger.error(`Error parsing file ${filePath}: ${error}`);
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
				block.line, // pass the line number
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
					it.line, // pass the line number
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
