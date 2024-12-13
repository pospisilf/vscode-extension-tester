import * as t from "@babel/types";
import traverse from "@babel/traverse";
import { parse } from "@babel/parser";


interface TestBlock {
    describe: string;
    line: number; // Line of occurrence
    its: { name: string; modifier: string | null; line: number }[];
    children: TestBlock[];
}

async function parseTestFile(content: string): Promise<TestBlock[]> {
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
  

// Mock file content for testing
const mockFileContent = `
describe('describe 1', function () {
    it('it 11', async function () {});
    describe('describe 2', function () {
        describe('describe 3', function () {
            it.skip('it 331', async function () {});
            it('it 32', async function () {});
        });
        it('it 21', async function () {});
    });
    it('it 122', async function () {});
});
`;

// Execute the parsing logic and print the output
(async () => {
    const result = await parseTestFile(mockFileContent);
    console.log(JSON.stringify(result, null, 2));
})();
