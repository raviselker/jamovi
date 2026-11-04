# Spec Delta

## Purpose

Lets users find data quickly by hiding the data view rows that do not contain a piece of text, across all columns or one column, without changing the data set, analyses or undo history.

## ADDED Requirements

### Requirement: Search hides non-matching rows
While a search is active, the data view SHALL display only the rows that match it, in the current sort order. Hidden rows SHALL remain in the data set, and analyses, filters and the saved file SHALL be unaffected.

#### Scenario: Matching rows only
- **WHEN** the user searches for "control" in a data set where 12 of 40 rows contain "Control"
- **THEN** only those 12 rows are displayed, with their data set row numbers

#### Scenario: Analyses unaffected
- **WHEN** a search is active
- **THEN** analysis results do not change and are not re-run

### Requirement: Search is view-only and session-only
Changing the search SHALL NOT create an undo step, mark the file as modified, or be saved in the file. Undo and redo SHALL NOT change the search.

#### Scenario: Not undoable
- **WHEN** the user edits a cell, then searches, then presses undo
- **THEN** the cell edit is undone and the search stays as it was

### Requirement: Default matching
By default, a row SHALL match when any searchable column contains the text as part of its displayed value, ignoring case. Decimals SHALL be matched as displayed (to the column's decimal places), and level columns by their labels. Missing values SHALL never match. Virtual and filter columns SHALL NOT be searched.

#### Scenario: Part of a cell, any case
- **WHEN** the user searches for "contr"
- **THEN** rows with "Control" in any column match

#### Scenario: Displayed decimals
- **WHEN** a column shows 1.50 and the user searches for "1.50"
- **THEN** that row matches

### Requirement: Match whole cell
The search field SHALL have a "Match whole cell" toggle, off when the bar opens. When on, a row SHALL match only when a searched cell's whole displayed value equals the text, ignoring case.

#### Scenario: Likert answers
- **WHEN** "Match whole cell" is on and the user searches Q3 for "1"
- **THEN** rows where Q3 is 1 match, and rows where Q3 is 10 or 11 do not

### Requirement: Searching one column
The search SHALL search all columns by default. The user SHALL be able to limit it to one column through a menu on the search field's magnifier, or with "Search in Column" in the variable and filter context menus, which searches the selected column. The field SHALL show the column as a removable tag. Removing the tag SHALL search all columns again.

#### Scenario: Search in Column
- **WHEN** the user right-clicks column Q3 and chooses "Search in Column"
- **THEN** the bar opens with the field focused, tagged Q3, and searches only Q3

#### Scenario: Removing the scope
- **WHEN** the user clicks the × on the Q3 tag
- **THEN** the search covers all columns again

#### Scenario: Searched column deleted
- **WHEN** the column being searched is deleted
- **THEN** the search ends, rather than widening to all columns

### Requirement: Opening and closing the search
Ctrl/Cmd+F in the data view and the ribbon's Search button SHALL open the bar and focus the field, selecting any existing text. When the field is empty and nothing is sorted, Ctrl/Cmd+F in the field or the Search button SHALL close the bar again. With text or a sort, they SHALL select the text instead.

#### Scenario: Toggle with nothing done
- **WHEN** the user presses Search, types nothing, and presses Search again
- **THEN** the bar closes

#### Scenario: Return to an existing search
- **WHEN** the user has searched for "abc" and clicked into the grid, then presses Search
- **THEN** the field is focused with "abc" selected

### Requirement: Applying the search while typing
The search SHALL apply about 250 ms after the user stops typing, and immediately on Enter. Esc SHALL clear the text, and Esc in an empty field SHALL close the bar if nothing is sorted. Esc SHALL NOT trigger other application behaviour, such as leaving full screen. A × button SHALL clear the text.

#### Scenario: Fast typing settles
- **WHEN** the user types "treatxx" quickly and deletes the last two characters
- **THEN** the displayed rows match "treat"

#### Scenario: Esc clears first
- **WHEN** the field contains text and the user presses Esc
- **THEN** the text is cleared, all rows are displayed and the bar stays open

### Requirement: Match count
While a search is active, the bar SHALL show how many rows match, as "1 row" or "N rows", including 0.

#### Scenario: No matches
- **WHEN** the user searches for text that no cell contains
- **THEN** the grid shows no data rows and the bar says "0 rows"

### Requirement: Search combined with sort and filters
Search SHALL combine with sorting: matching rows are displayed in sort order, and sort columns can be added while searching. Rows hidden by filters SHALL stay hidden. Clear SHALL end both the search and the sort and close the bar.

#### Scenario: Sort within a search
- **WHEN** the user searches for "control" and then sorts by C
- **THEN** only Control rows are displayed, ordered by C

### Requirement: Editing while searching
Cell edits SHALL apply to the data set row displayed. An edited row that no longer matches SHALL stay displayed until the search changes. Rows typed below the matches SHALL be appended and shown. Inserting and deleting rows SHALL be disabled and rejected by the server, as while sorted.

#### Scenario: Edit makes a row stop matching
- **WHEN** a search for "control" shows row 5, and the user changes row 5's value to "Treat"
- **THEN** data set row 5 changes, stays displayed, and the count is unchanged

### Requirement: Search is fast on large data sets
On a data set of one million rows by ten columns, or 50 000 rows by 500 columns, applying a search SHALL complete within about one second on a typical laptop.

#### Scenario: One million rows
- **WHEN** the user searches all columns of a 1,000,000 × 10 data set
- **THEN** the matching rows are displayed within about one second
