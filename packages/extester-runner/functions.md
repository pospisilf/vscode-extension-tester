## Function table

| Function                                                                       | For kickoff   | Implemented     | Working |
| -------------------------------------------------------------------------------| ------------- | --------------- | ------- |
| Loading all files matching regex to View                                       | yes           | yes             |         |
| Splitting files based on specific directories                                  | yes           | yes             |         |
| Basic parsing of describes and tests                                           | yes           | yes             |         |
| Support skip/only for describe                                                 | yes           | TBD             |         |
| Support skip/only for it                                                       | yes           | yes             |         |
| Parsing decsribe/it with condition                                             | no            | ---             |         |
| Manual refresh button                                                          | yes           | yes             |         |
| Automatic refresh when file saved/new file created/...                         | yes           | yes             |         |
| Run all tests                                                                  | yes           | yes             |         |
| Run all tests in folder                                                        | yes           | yes             |         |
| Run one test file                                                              | yes           | yes             |         |
| Run one describe                                                               | no            | ---             |         |
| Run one it                                                                     | no            | ---             |         |
| Open file with click on file name                                              | yes           | yes             |         |
| Jump on line of describe/it                                                    | yes           | FIX             |         |
| Show describe/it on hover                                                      | yes           | yes             |         |
| Select src/exculed/out in settings                                             | yes           | yes             |         |
| Constant order of files in TreeView                                            | no            | ---             |         |
| Show only last part of path (only debug instead of src/tests/debug)            | ?             | ?               |         |
| Show full path on hover                                                        | yes           | TBD             |         |
| Switching of showing full/short path in setting                                | ?             | ne              |         |
| Search between files                                                           | yes           | TBD             |         |
| Highlight for only/skip describes and its                                      | yes           | TBD             |         |
| Support more src/exclude/out paths                                             | no            | no              |         |

## Known issues

- clicking on describe/it is not working
- clicking on file name opens file on random place, not on line 1
- describe is parsed correctly but only/skip condition is missed (if there's any)

## Can't do
- highlighting items with only/skip can't be done by bold/italic font -> not supported by TreeView but we can use different icons
