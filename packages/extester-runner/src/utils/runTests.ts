import * as vscode from 'vscode';

export async function runAllTests() {
  vscode.window.showInformationMessage('Running UI tests in the terminal...');

  let terminal = vscode.window.terminals.find(t => t.name === 'UI Test Runner');
  if (!terminal) {
    terminal = vscode.window.createTerminal({
      name: 'UI Test Runner',
    });
  }

  terminal.show();
  terminal.sendText('npm run ui-test');

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Running UI tests...",
      cancellable: false,
    },
    async () => {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  );

  vscode.window.showInformationMessage('UI tests have been initiated in the terminal.');
}
