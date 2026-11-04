# Tasks

Server tests run with `docker compose --profile tests run --rm test -c "python3 -m pytest -q /usr/lib/jamovi/server/jamovi/tests"`. Run the app with `docker compose --profile main build jamovi && docker compose --profile main up -d jamovi` at http://127.0.0.1:41337/.

## 1. Protocol

- [ ] 1.1 Add `sort` (`keys {columnId, descending}`, `stale`) and `search` (`ViewSearch {text, columnIds, whole, matches}`, field 18) to `DataSetSchema` in `jamovi.proto`; verify that the server and client builds regenerate the bindings without errors

## 2. View order in the core

- [ ] 2.1 Store the view order and its inverse as index columns in `DataSetW`, with `refreshViewOrder` and `updateViewOrder` covering filtered rows; verify that the existing filter tests still pass and hidden filtered rows still display correctly
- [ ] 2.2 Add the stable multi-key sort (ordinal by level order, text by label, others by value, missing last, ties in data set order) and `isViewOrderSorted`; verify with tests in `test_view_order.py` for each column type, missing values and multi-key ties
- [ ] 2.3 Add `ColumnW::searchRows` and `DataSetW::searchRows` (part or whole cell, ignoring ASCII case, decimals as displayed, level labels, missing never matches, all columns except filter and virtual); verify with tests for each of these cases, including one column and whole cell
- [ ] 2.4 Make `updateViewOrder` keep edited rows displayed and show appended rows; verify with a test that edits a matching row so it no longer matches and appends a row while searching
- [ ] 2.5 Expose `refresh_view_order(sort_keys, ex_filtered, search)`, `update_view_order(ex_filtered, search)` and `is_view_order_sorted` in `core.pyx` (UTF-8 text); verify that `test_view_order_store.py` calls them through the Python API

## 3. Server model and requests

- [ ] 3.1 Add `sort_keys` (logged for undo) and session-only `search` to `DataSetModel`, with `invalidate_view_order(rebuild)`, `view_order_stale` and the drop of deleted sort/search columns; verify with model tests for the rebuild/update rules, the stale flag and column deletion (search ends, sort keeps the rest)
- [ ] 3.2 Handle the sort and search in data set requests, populate both in the schema response with `matches`, and re-sort on sort/search/filter changes; verify with a request test that sets a search and gets the right `matches`
- [ ] 3.3 Reject row insert/delete while sorted or searched, and map view rows to data set rows in cell edits (including `bottom_most_row_index`); verify with tests that inserting fails with the message, and that typing below the matches appends without an IndexError
- [ ] 3.4 Check that undo restores the sort but never changes the search, and that neither is saved; verify with a test that saves and reopens a sorted, searched data set

## 4. Client: sorting

- [ ] 4.1 Add `sortKeys`, `sortStale`, `setSort`, `resort` and `isSorted` to the client `DataSet`, and the `sort` action to `ViewController` (sort selection, flip when equal, disable without sortable columns); verify in the app that Sort sorts the selection and pressing it again flips it
- [ ] 4.2 Add the View group (Search, Sort) at the far right of the Data ribbon with `menu-search.svg` and `menu-sort.svg`, remove Sort from the Variables group, and add Sort to the variable and filter context menus; verify the ribbon and menus in the app, including the key tips
- [ ] 4.3 Build the sort bar (chips with flip, remove and drag to reorder; "Add column" via `VariableList`; Re-sort when stale; Clear) and the header arrows tied to the bar's open state (hover, touch selection, shift-click for sole sort); verify each sort scenario in `specs/data-view-sort/spec.md` in the app
- [ ] 4.4 Disable insert/delete row actions while sorted, and check copy/paste of a sorted selection copies the displayed rows; verify in the app

## 5. Client: searching

- [ ] 5.1 Add `search`, `setSearch` (noUndo), `isSearching` and `visibleRowCount` (uses `matches`) to the client `DataSet`; verify that the row count and the grid follow `matches`
- [ ] 5.2 Build the search field in the bar (magnifier menu for the column scope, scope tag, input, ×, "ab" whole-cell toggle, count), with the debounce, Enter, Esc and Ctrl/Cmd+F behaviour; verify each scenario in `specs/data-view-search/spec.md` in the app
- [ ] 5.3 Add the `search` and `searchColumn` actions ("Search in Column" with `menu-search-column.svg` in the context menus) and the ribbon toggle; replace the 250 ms focus timer with a focus hand-over in the interaction manager; verify that Search focuses the field on the first click
- [ ] 5.4 End the search when its column is deleted and refresh the scope list on column changes; verify in the app

## 6. Client: variables view

- [ ] 6.1 Restyle the variables search with the shared `.jmv-search-field` classes, add the count, debounce, Enter, Esc and Ctrl/Cmd+F, and align the bar with the data view's; verify each scenario in `specs/variables-search/spec.md`
- [ ] 6.2 Check search with filters active (filtered rows stay hidden, the count excludes them); verify in the app with a filter that hides matching rows

## 7. Integration

- [ ] 7.1 Measure searching and sorting on a 1,000,000 × 10 and a 50,000 × 500 data set; verify each is within about one second
- [ ] 7.2 Run the full server test suite and a browser pass over all spec scenarios; verify there are no failures and no console errors
