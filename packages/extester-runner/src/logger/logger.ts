import * as vscode from 'vscode';

export class Logger {
    private outputChannel: vscode.OutputChannel;

    constructor(outputChannel: vscode.OutputChannel) {
        this.outputChannel = outputChannel;
    }

    info(message: string) {
        this.outputChannel.appendLine(`[INFO] ${message}`);
    }

    debug(message: string) {
        this.outputChannel.appendLine(`[DEBUG] ${message}`);
    }

    error(message: string) {
        this.outputChannel.appendLine(`[ERROR] ${message}`);
    }
}

export function createLogger(outputChannel: vscode.OutputChannel): Logger {
    return new Logger(outputChannel);
}
