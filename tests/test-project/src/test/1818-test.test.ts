import { expect } from 'chai';
import path from 'path';
import { EditorView, InputBox, VSBrowser, Workbench } from 'vscode-extension-tester';

describe.only('issue 1818 test', function () {
	let editorView: EditorView;

	describe('no diff editor', function () {
		before(async function () {
			this.timeout(120000);

			// close all existing editors to start clean
			editorView = new EditorView();
			await editorView.closeAllEditors();

			// open two test files
			await VSBrowser.instance.openResources(
				path.resolve(__dirname, '..', '..', 'resources', 'test-file-a.txt'),
				path.resolve(__dirname, '..', '..', 'resources', 'test-file-b.txt'),
			);
		});

		after(async function () {
			editorView = new EditorView();
			await editorView.closeAllEditors();
		});

		it('getActiveTab() - no diff', async function () {
			editorView = new EditorView();

			// first
			await new Workbench().executeCommand('View: Open First Editor in Group');
			let activeTab = await editorView.getActiveTab();
			let activeTabTitle = await activeTab?.getTitle();
			expect(activeTabTitle).to.equal('test-file-a.txt');

			// second
			await new Workbench().executeCommand('View: Open Last Editor in Group');
			activeTab = await editorView.getActiveTab();
			activeTabTitle = await activeTab?.getTitle();
			expect(activeTabTitle).to.equal('test-file-b.txt');
		});

		it('getOpenTabs() - no diff', async function () {
			editorView = new EditorView();

			const openTabs = editorView.getOpenTabs();
			expect((await openTabs).length).to.equal(2);

			// first tab
			const firstTab = (await openTabs)[0];
			const firstTitle = await firstTab.getTitle();
			expect(firstTitle).to.equal('test-file-a.txt');

			// second tab
			const secondTab = (await openTabs)[1];
			const secondTitle = await secondTab.getTitle();
			expect(secondTitle).to.equal('test-file-b.txt');
		});

		it('getOpenEditorTitles() - no diff', async function () {
			editorView = new EditorView();

			const openEditorTitles = await editorView.getOpenEditorTitles();
			expect((await openEditorTitles).length).to.equal(2);

			// first editor
			const firstEditor = (await openEditorTitles)[0];
			expect(firstEditor).to.equal('test-file-a.txt');

			// second editor
			const secondEditor = (await openEditorTitles)[1];
			expect(secondEditor).to.equal('test-file-b.txt');
		});
	});

	describe('with diff editor', function () {
		before(async function () {
			this.timeout(120000);

			// close all existing editors to start clean
			editorView = new EditorView();
			await editorView.closeAllEditors();

			// open two test files
			await VSBrowser.instance.openResources(
				path.resolve(__dirname, '..', '..', 'resources', 'test-file-a.txt'),
				path.resolve(__dirname, '..', '..', 'resources', 'test-file-b.txt'),
			);

			// open diff editor
			await new Workbench().executeCommand('View: Open First Editor in Group');
			await new Workbench().executeCommand('File: Compare Active File With...');

			const quickOpen = await InputBox.create();
			await quickOpen.setText('test-file-b.txt');
			await quickOpen.confirm();
		});

		after(async function () {
			editorView = new EditorView();
			await editorView.closeAllEditors();
		});

		it('getActiveTab() - with diff', async function () {
			this.timeout(999999);
			editorView = new EditorView();

			const openTabs = editorView.getOpenTabs();
			expect((await openTabs).length).to.equal(3);

			// first
			await new Workbench().executeCommand('View: Open First Editor in Group');
			let activeTab = await editorView.getActiveTab();
			let activeTabTitle = await activeTab?.getTitle();
			expect(activeTabTitle).to.equal('test-file-a.txt');

			// second - diff editor
			await new Workbench().executeCommand('View: Open Next Editor in Group');
			activeTab = await editorView.getActiveTab();
			activeTabTitle = await activeTab?.getTitle();
			expect(activeTabTitle).to.equal('test-file-a.txt ↔ test-file-b.txt');

			// third
			await new Workbench().executeCommand('View: Open Last Editor in Group');
			activeTab = await editorView.getActiveTab();
			activeTabTitle = await activeTab?.getTitle();
			expect(activeTabTitle).to.equal('test-file-b.txt');
		});

		it('getOpenTabs() - with diff', async function () {
			editorView = new EditorView();

			const openTabs = editorView.getOpenTabs();
			expect((await openTabs).length).to.equal(3);

			// first tab
			const firstTab = (await openTabs)[0];
			const firstTitle = await firstTab.getTitle();
			expect(firstTitle).to.equal('test-file-a.txt');

			// second tab - diff editor
			const secondTab = (await openTabs)[1];
			const secondTitle = await secondTab.getTitle();
			expect(secondTitle).to.equal('test-file-a.txt ↔ test-file-b.txt');

			// third tab
			const thirdTab = (await openTabs)[2];
			const thirdTitle = await thirdTab.getTitle();
			expect(thirdTitle).to.equal('test-file-b.txt');
		});

		it('getOpenEditorTitles() - with diff', async function () {
			editorView = new EditorView();

			const openEditorTitles = await editorView.getOpenEditorTitles();
			expect((await openEditorTitles).length).to.equal(3);

			// first editor
			const firstEditor = (await openEditorTitles)[0];
			expect(firstEditor).to.equal('test-file-a.txt');

			// second editor - with diff
			const secondEditor = (await openEditorTitles)[1];
			expect(secondEditor).to.equal('test-file-a.txt ↔ test-file-b.txt');

			// third editor
			const thirdEditor = (await openEditorTitles)[2];
			expect(thirdEditor).to.equal('test-file-b.txt');
		});
	});
});
