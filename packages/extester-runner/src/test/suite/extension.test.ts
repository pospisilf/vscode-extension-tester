import * as assert from 'assert';
import { after } from 'mocha';

import * as vscode from 'vscode';

// This test is only example test and will be removed once relevant tests are added.
describe('Extension Test Suite', () => {
	after(() => {
		vscode.window.showInformationMessage('All tests done!');
	});

	it('Sample test', () => {
		assert.strictEqual(-1, [1, 2, 3].indexOf(5));
		assert.strictEqual(-1, [1, 2, 3].indexOf(0));
	});
});
