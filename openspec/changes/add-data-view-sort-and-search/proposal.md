# Proposal

## Why

People regularly need to look at their data in a different order ("who scored highest?") or find specific rows ("where is subject 10?", "how many people answered 1 on Q3?"). Today jamovi's data view can do neither: users scroll, or copy the data to a spreadsheet. Sorting and searching that only change what the data view shows, without touching the data set or analyses, close this gap.

A working prototype exists on the `data-view-sort-search` branch (on top of PR #1901), including the column search. This change specifies its behaviour so that it can be implemented properly on master.

## What Changes

- **Sorting the data view** by one or more columns, ascending or descending. It only changes the order in which rows are displayed. Analyses, computed columns and the saved data set are unaffected. Sort changes are undoable.
- **One Sort button** in a new **View** group at the far right of the Data ribbon, and **Sort** in the variable and filter context menus. They sort by the selected columns, and pressing Sort again with the same selection flips the direction.
- **A sort/search bar** above the grid while sorting or searching. It shows the search field, the match count, a chip for each sort column (flip, remove, drag to reorder), an "Add column" picker, a Re-sort button when edits have left rows out of order, and Clear.
- **Header sort arrows**, which only appear while the bar is open. Sorted columns always show theirs; other columns show it on hover, or when selected on touch screens.
- **Searching the data view**, which hides rows that don't match the text. The main field matches part of a cell, ignores case and looks in all columns. A "Match whole cell" toggle is available. Search is view-only: it is not saved and not undoable. It is opened with Ctrl/Cmd+F or the new **Search** button in the View group. While a search runs the rows dim briefly, and matched text is highlighted in the cells.
- **Column search**: a toggle in the bar shows a search box under each column header. Each box searches its own column, and a row must match every box (and the main field) to be shown, e.g. Group "control" and Q3 "1", or Subject "10" and Session "2". "Search in Column" in the context menu opens the boxes with the selected column's box focused. It is never called a "filter", so it isn't confused with jamovi's data filters.
- **Inserting and deleting rows is blocked** while the data is sorted or searched. Appending rows and editing cells still work.
- **The variables view search** gets the same field style as the data view's (glyph, clear button, match count), Ctrl/Cmd+F to focus it, and Esc to clear it. It stays visible at all times.

## Capabilities

### New Capabilities
- `data-view-sort`: ordering the rows displayed in the data view by column values, and the controls for it (ribbon, context menu, header arrows, sort bar).
- `data-view-search`: hiding data view rows that do not match a text search across all columns, or per-column searches combined, and the controls for it.
- `variables-search`: filtering the variables view's list of variables by name or description.

### Modified Capabilities
None. There are no existing specs in `openspec/specs/`.

## Impact

- **Server core (C++, Cython):** the data set's view order (which data set row is shown at each view row) gains sorting and a search mask alongside the existing hidden-filtered-rows handling.
- **Server (Python):** data set model state for sort keys and search, and data set request handling: setting the sort and search, re-sorting, blocking row insert/delete, and mapping view rows to data set rows for cell edits.
- **Protocol (`jamovi.proto`):** `DataSetSchema` gains the sort (keys, stale flag) and the search (text, whole-cell flag, match count, and a term per searched column).
- **Client:** data set model, view controller actions, table view (sort bar, header arrows, search field, column search row, match highlighting), Data ribbon (View group), context menus, variables view search, and new icons (`menu-sort.svg`, `menu-search.svg`, `menu-search-column.svg`).
- **File format:** none. Neither the sort nor the search is saved in `.omv` files.
