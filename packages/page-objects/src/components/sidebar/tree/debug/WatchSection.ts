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

import { Key, WebElement } from 'selenium-webdriver';
import { ViewContent } from '../../ViewContent.js';
import { GenericCustomTreeSection } from '../custom/CustomTreeSection.js';
import { WatchSectionItem } from './WatchSectionItem.js';

export class WatchSection extends GenericCustomTreeSection<WatchSectionItem> {
	constructor(panel: WebElement, viewContent: ViewContent) {
		super(panel, viewContent, WatchSectionItem);
	}

	/**
	 * Add item to Watch section.
	 * @param name
	 */
	async addItem(name: string): Promise<void> {
		await (await this.getAction(WatchSection.locators.WatchSection.addExpression))?.click();
		await new Promise((res) => setTimeout(res, 1000));
		const textInput = await this.findElement(WatchSection.locators.WatchSection.input);
		await textInput.clear();
		await textInput.sendKeys(name + Key.ENTER);
	}

	/**
	 * Click on 'Refresh' button.
	 */
	async refresh(): Promise<void> {
		await (await this.getAction(WatchSection.locators.WatchSection.refresh))?.click();
	}

	/**
	 * Remove all items in Watch seection by using 'Remove All Expression' button.
	 */
	async removeAllExpressions(): Promise<void> {
		await (await this.getAction(WatchSection.locators.WatchSection.removeAll))?.click();
	}

	/**
	 * Collapse all items in Watch section by using 'Collapse All' button.
	 */
	async collapseAll(): Promise<void> {
		await (await this.getAction(WatchSection.locators.WatchSection.collapseAll))?.click();
	}
}
