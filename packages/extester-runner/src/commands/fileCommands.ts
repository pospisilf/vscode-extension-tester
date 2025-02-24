import * as vscode from 'vscode';
import { Logger } from '../logger/logger';

export function registerFileCommands(context: vscode.ExtensionContext, logger: Logger) {
    context.subscriptions.push(
            vscode.commands.registerCommand('extesterRunner.openTestItem', async (filePath: string, lineNumber?: number) => {
                logger.info(`User triggered: extester-runner.openTestItem for filePath: ${filePath} on line ${lineNumber}`);
                if (filePath) {
                    try {
                        const document = await vscode.workspace.openTextDocument(filePath);
                        const editor = await vscode.window.showTextDocument(document);
    
                        const position =
                            lineNumber !== undefined
                                ? new vscode.Position(lineNumber - 1, 0) // convert to 0-based index
                                : new vscode.Position(0, 0);
    
                        const range = new vscode.Range(position, position);
                        editor.revealRange(range, vscode.TextEditorRevealType.InCenter); // center the line in the editor
                        editor.selection = new vscode.Selection(position, position); // set the cursor to the line
                    } catch (error) {
                        logger.error(`Failed to open file: ${error}`);
                        vscode.window.showErrorMessage(`Failed to open file: ${error}`);
                    }
                }
            }),
        );
}
