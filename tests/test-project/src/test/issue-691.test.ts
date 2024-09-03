/**
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License", destination); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import path from "path";
import { ActivityBar, EditorView, SideBarView, TextEditor, VSBrowser, WebDriver } from "vscode-extension-tester";

describe.only('issue-691', function () {

    let driver: WebDriver;
    let editor: TextEditor;

    before(async function () {
        driver = VSBrowser.instance.driver;
        await VSBrowser.instance.openResources(path.resolve('resources', 'debug-project'));
        await (await new ActivityBar().getViewControl('Explorer')).openView();
        const section = await new SideBarView().getContent().getSection('debug-project');
        await section.openItem('test.js');
        editor = (await new EditorView().openEditor('test.js')) as TextEditor;
        driver = editor.getDriver();
    });

    it('test1', async function () {
        this.timeout(120000);
        await editor.toggleConditionalBreakpoint(1);
        await new Promise((res) => setTimeout(res, 60000));
    });
});
