import * as vscode from 'vscode';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import { NodePath } from '@babel/traverse';
import * as t from '@babel/types'; // Import Babel types for type checks

// Find TypeScript test files
async function findTestFiles(): Promise<vscode.Uri[]> {
    const pattern = '**/*.test.ts'; // Customize this pattern
    return vscode.workspace.findFiles(pattern, '**/node_modules/**');
}

interface TestBlock {
    describe: string;
    its: { name: string; modifier: string | null }[];
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
    
          // Handle `describe` blocks
          if (functionName === "describe") {
            const describeArg = path.node.arguments[0];
            const describeName = t.isStringLiteral(describeArg)
              ? describeArg.value
              : "Unnamed Describe";
    
            const newDescribeBlock: TestBlock = {
              describe: describeName,
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




// Command to parse tests
async function parseExTesterTests() {
    const files = await findTestFiles();
    if (!files.length) {
        vscode.window.showInformationMessage('No test files found.');
        return;
    }

    for (const file of files) {
        const structure = await parseTestFile(file);
        console.log(`Test structure in ${file.fsPath}:`, JSON.stringify(structure, null, 2));
    }

    vscode.window.showInformationMessage('ExTester test parsing completed. Check the console for details.');
}

// Extension activation
export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand('extester-runner.parseTests', parseExTesterTests)
    );
}

// Extension deactivation
export function deactivate() { }
