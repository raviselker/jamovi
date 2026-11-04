# Design

## Context

See proposal.md for the motivation. Specs: `data-view-sort`, `data-view-search`, `variables-search`.

- The data set lives in the server's memory-mapped C++ store (`server/jamovi/core`, `DataSetW`/`ColumnW`). Python wraps it through Cython (`core.pyx`) and `DataSetModel`. The client asks for cells by view row through `DataSetRR` requests.
- The data view can already hide filtered-out rows. That is done with a view lookup: an index column mapping each displayed row to a data set row, plus its inverse.
- Reference implementation: branch `data-view-sort-search` on `raviselker/jamovi` (commits `bffaef23`, the sort from PR #1901, and `c17975d5`, the rework and search). It is a prototype; reuse its approach, but re-check the code as it is written.

## Goals / Non-Goals

**Goals:**
- One mechanism, the view order, handles filtered rows, sort and search together, so cell fetching, editing and row headers need only one row mapping.
- Sorting and searching a million rows stay well under a second, and the client never loads the whole column to do it.

**Non-Goals:**
- Highlighting the matching text inside cells.
- Unicode-aware case folding (only ASCII is lowercased; see Risks).
- Regular expressions, numeric comparisons ("> 5") or searching for missing values.
- Saving the sort or search in `.omv` files.
- Sorting or searching from the results panel or from analyses.

## Decisions

### View order in the C++ store
The store keeps the view order (data set row per view row) and its inverse as index columns. `refreshViewOrder(sortKeys, exFiltered, search…)` rebuilds it with a stable sort over per-column sort keys and drops rows excluded by filters or the search mask. `updateViewOrder(exFiltered, search…)` keeps the current order and only adds or removes rows. Edited rows stay displayed, and rows appended at the end (`rowNo >= rowCount before`) are shown.
*Alternative:* sorting on the client was rejected because it needs every value of the sort columns on the client, which defeats the paged cell fetching on large data.

### Rebuild vs. update
`DataSetModel.invalidate_view_order(rebuild=…)` decides. A change to the sort, the search or the filters (without a data edit) rebuilds. Data edits, a changed row count or a changed sort column only update, so rows don't jump while the user is editing. After an update, `view_order_stale` is true when the rows are no longer in sort order. It is sent to the client as `sort.stale` and shown as Re-sort.

### Search mask computed in C++
`ColumnW::searchRows(text, whole, matches)` ORs into a per-row byte mask. Decimals are formatted to the column's `dps`. Text IDs use their raw strings. Level columns test each level label once, then look rows up by value. Missing values never match. With no column ids, `DataSetW::searchRows` searches every column except filter and virtual ones.
*Alternative:* matching in Python was too slow on 1M rows.

### Search is session state, not data set state
`DataSetModel._search = (text, column_ids, whole)` lives only in memory. The client sends it with `noUndo`, so it isn't logged by the modification tracker. The sort *is* logged (`log_sort_change`), so undo restores it. Neither is written by `formatio`.

### Protocol
`DataSetSchema` gains `sort` (repeated keys `{columnId, descending}`, `stale`) and `search` (`ViewSearch {text, columnIds, whole, matches}`, field 18). The schema response always fills both, with `matches` set to the view row count, so the client can show the count without another request.

### Client controls
- `ViewController` owns the actions: `sort` sorts the selection or flips it, `search` toggles the bar, `searchColumn` opens it scoped. `sortColumn(id, only)` handles header and chip clicks.
- `TableView` builds the sort/search bar. Its open state (sorted || search open || searching) also toggles the `sorting` class that shows the header arrows.
- Column pickers (sort "Add column", search scope) use jamovi's `vareditor/dropdown` with `VariableList`. A hidden `<select>` holds the value, and its `mousedown` is cancelled. *Alternative:* a native `<select>` was rejected because macOS blinks its popup for a few hundred ms before `change` fires.
- The ribbon gets a **View** group at the far right: Search, then Sort. The Variables group loses its old Sort dropdown.

### Row insert/delete while sorted or searched
View rows aren't contiguous data set rows then, so insert/delete is disabled on the client and rejected on the server ("You cannot insert/delete rows while the data is sorted or searched"). `_apply_cells` maps view rows to data set rows and recomputes the bottom-most row from the mapped indices.

## Risks / Trade-offs

- [Ribbon focus] The ribbon's interaction manager pulls focus back for about 200 ms after a ribbon click, so the prototype focuses the search field after 250 ms (`shortcut:` comment). → Implement a proper focus hand-over in the interaction manager instead of the timer.
- [ASCII-only case folding] "Ä" doesn't match "ä". → Acceptable for a first version. Use ICU or a full case fold later if users ask for it.
- [Stale counts after edits] An edited row that no longer matches stays displayed and still counts, so the count can be off until the search changes. → This is intended: it keeps the user's place.
- [Large wide data] Searching all columns of 50k × 500 takes about 0.5 s. → The 250 ms debounce keeps it from running per keystroke. Searching could run off the request thread later if needed.
- [Untested combinations] The prototype didn't test search with filters, or copy/paste of a sorted or searched selection. → Covered by tasks 4.4 and 6.2.

## Migration Plan

None needed: nothing is saved, and the protocol fields are new. Older clients ignore them.
