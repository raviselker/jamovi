# Spec Delta

## Purpose

Lets users find data quickly by hiding the data view rows that do not contain a piece of text, across all columns or per column, without changing the data set, analyses or undo history.

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
- **WHEN** "Match whole cell" is on and the user types "1" in Q3's column search box
- **THEN** rows where Q3 is 1 match, and rows where Q3 is 10 or 11 do not

#### Scenario: One toggle for every search
- **WHEN** "Match whole cell" is on
- **THEN** it applies to the main field and to every column search box

### Requirement: Column search
The main field SHALL search all columns. A toggle button beside it, with a badge counting the columns searched, SHALL show or hide a row with a search box under each column header. Each box SHALL search only its column, and a row SHALL be displayed only when it matches the main field (if it has text) and every box with text. Hiding the row SHALL clear its boxes. The user interface SHALL call this "Column search", never "filter", so it is not confused with the data filters.

#### Scenario: Subgroup
- **WHEN** the user types "control" in Group's box and "1" in Q3's box
- **THEN** only rows where Group contains "control" and Q3 contains "1" are displayed, and the badge shows 2

#### Scenario: Lookup
- **WHEN** the user types "10" in Subject's box and "2" in Session's box, with "Match whole cell" on
- **THEN** only subject 10's session 2 row is displayed

#### Scenario: Search in Column
- **WHEN** the user right-clicks column Q3 and chooses "Search in Column"
- **THEN** the bar and the column search row open with Q3's box focused

#### Scenario: Hiding the row
- **WHEN** boxes have text and the user turns column search off
- **THEN** the boxes are cleared and only the main field's search remains

#### Scenario: Searched column deleted
- **WHEN** a column with text in its box is deleted
- **THEN** its term is dropped and the other searches stay

### Requirement: Column search layout
Each box SHALL stay aligned with its column when columns are resized, added or removed, when the data view scrolls, and when the row number column changes width. A box with text SHALL be highlighted and its column header tinted. The row SHALL slide open and closed without the column headers moving, and without motion when the system asks for reduced motion. Typing in a box SHALL keep focus in it while the results update.

#### Scenario: Row numbers narrow
- **WHEN** a search leaves only rows numbered below 100 in a data set of 150 rows
- **THEN** the boxes stay aligned with their columns

#### Scenario: Focus kept
- **WHEN** the user types in Group's box and the matching rows change
- **THEN** the box keeps the focus and the caret

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

### Requirement: Search feedback
While a search is being applied, the displayed rows SHALL dim until the new rows are shown, without motion. Displayed cells SHALL highlight the matched text: a column's own term where it has one, otherwise the main field's text.

#### Scenario: Results arrive
- **WHEN** the user types in a search field
- **THEN** the rows dim from the first keystroke and the matching rows appear undimmed

#### Scenario: Highlight
- **WHEN** the user searches for "contr"
- **THEN** "Contr" is highlighted in each displayed "Control" cell

### Requirement: Match count
While a search is active (the main field or any column search box), the bar SHALL show how many rows match, as "1 row" or "N rows", including 0.

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
