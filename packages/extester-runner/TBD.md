# Known Issues and Ideas

## Known Issues

- Tests with conditionals ~~or `.skip/.only`~~ do not display correctly.
- The Test Explorer does not have a consistent order of items.
- **Refresh behavior**: Issues when editing/creating/deleting tests and saving.
- ~~**Run ability**: Missing options to "Run All" and "Run File."~~
- Display only the last part of the path (e.g., debug, editor, bottombar) and show the full folder path in the description or tooltip.
- Displaying paths: Add support for simple vs. full paths (e.g., debug vs. src/test/debug). Optionally, support for custom paths.
- Running tests: Reuse an existing script? (Likely not; the script may need to be rewritten and use extest smhtng...) (not implemented at all now)

## Ideas

- Add support for filter/search functionality.
- Highlight tests that have `.only` or `.skip.`
- **Run ability**: Add options to "Run Folder," "Run Describe(?)," and "Run It(?)."
- Support multiple paths for finding test files and excluding paths.