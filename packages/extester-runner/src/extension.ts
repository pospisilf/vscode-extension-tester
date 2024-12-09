import * as vscode from 'vscode';
import { ExtesterTreeProvider } from './tree/ExtesterTreeProvider';
import { runAllTests } from './utils/runTests';

export function activate(context: vscode.ExtensionContext) {
  const treeDataProvider = new ExtesterTreeProvider();
  vscode.window.registerTreeDataProvider('extesterView', treeDataProvider);

  context.subscriptions.push(
    vscode.commands.registerCommand('extester-runner.refreshTests', () => {
      treeDataProvider.refresh();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extester-runner.runAll', async () => {
      vscode.window.showInformationMessage('Running all tests...');
      await runAllTests();
    })
  );
}

export function deactivate() {}
