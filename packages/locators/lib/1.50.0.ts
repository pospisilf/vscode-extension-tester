import { LocatorDiff } from "@redhat-developer/page-objects";
import { By } from "selenium-webdriver";

export const diff: LocatorDiff = {
    locators: {
        EditorView: {
            closeTab: By.className('codicon-close')
        }
    }
}