# Spec Delta

## Purpose

Lets users view the rows of the data view in the order of one or more columns' values, without changing the data set, its row numbers or any analysis.

## ADDED Requirements

### Requirement: Sorting only changes the displayed row order
The system SHALL let the data view be sorted by one or more columns, each ascending or descending. Sorting SHALL only change the order rows are displayed in. Data set row numbers, analyses, computed columns, filters and the saved file SHALL be unaffected.

#### Scenario: Analyses unaffected
- **WHEN** the user sorts by column `score` while a Descriptives analysis uses it
- **THEN** the analysis results do not change and are not re-run

#### Scenario: Row numbers follow their rows
- **WHEN** the data is sorted so that data set row 7 is displayed first
- **THEN** the row header of the first displayed row shows 7

#### Scenario: Sort not saved
- **WHEN** the user sorts the data, saves the file and reopens it
- **THEN** the data is displayed unsorted

### Requirement: Sort order per column type
Ordinal columns SHALL sort by level order. Other text and nominal columns SHALL sort by label. Continuous and ID columns SHALL sort by value. Missing values SHALL sort last in both directions. Rows with equal keys SHALL keep their data set order. Later sort columns SHALL break ties left by earlier ones.

#### Scenario: Ordinal by level order
- **WHEN** an ordinal column with levels Low, Medium, High is sorted ascending
- **THEN** rows appear in the order Low, Medium, High, not alphabetically

#### Scenario: Missing values last
- **WHEN** a column with missing values is sorted descending
- **THEN** rows with a missing value are displayed after all other rows

#### Scenario: Multi-column ties
- **WHEN** the data is sorted by `group` ascending, then `score` descending
- **THEN** rows within each group are ordered by score, highest first

### Requirement: Only real columns are sortable
Data and computed columns SHALL be sortable. Virtual (empty, unset) columns SHALL NOT be sortable. When a sort column is deleted, it SHALL be removed from the sort and the remaining columns SHALL keep their order.

#### Scenario: Deleting a sort column
- **WHEN** the data is sorted by A then B, and the user deletes column A
- **THEN** the data is sorted by B only

### Requirement: Sort button sorts the selection
The Data ribbon SHALL have a Sort button in a View group at its far right, after Search. The variable and filter context menus SHALL have a Sort item. Sort SHALL sort by the selected columns, ascending, in the order they were selected, replacing any existing sort.

#### Scenario: Sorting selected columns
- **WHEN** the user selects columns B then A and presses Sort
- **THEN** the data is sorted by B ascending, then A ascending, and the sort bar opens

#### Scenario: Nothing sortable selected
- **WHEN** only virtual columns are selected
- **THEN** the Sort button and menu item are disabled

### Requirement: Sorting again flips the direction
When the selected columns are exactly the columns already sorted by, pressing Sort SHALL flip the direction of every sort column and keep their priority.

#### Scenario: Press Sort twice
- **WHEN** the user presses Sort with column A selected, then presses Sort again without changing the selection
- **THEN** the data is sorted by A descending

### Requirement: Header sort arrows while the bar is open
While the sort/search bar is open, sorted column headers SHALL show an arrow for their direction, with their priority number when sorting by several columns. Other sortable headers SHALL show a faint arrow on hover, or when selected with a touch/coarse pointer. While the bar is closed, no arrows SHALL show.

#### Scenario: Hidden when closed
- **WHEN** the bar is closed and the user hovers a column header
- **THEN** no sort arrow is shown

#### Scenario: Hover while open
- **WHEN** the bar is open (sorting or only searching) and the user hovers an unsorted column header
- **THEN** a faint sort arrow is shown on that header

#### Scenario: Touch screen
- **WHEN** the bar is open on a touch screen and the user selects an unsorted column
- **THEN** that header shows its sort arrow, clear of the column resize handle

### Requirement: Clicking a header arrow
Clicking a sorted column's arrow SHALL flip that column's direction and keep its priority. Clicking an unsorted column's arrow SHALL add it as the last sort column, ascending. Shift-clicking any arrow SHALL sort by that column alone. Clicking an arrow SHALL NOT change the selection.

#### Scenario: Add a sort column
- **WHEN** the data is sorted by A and the user clicks B's arrow
- **THEN** the data is sorted by A, then B ascending

#### Scenario: Shift-click
- **WHEN** the data is sorted by A then B and the user shift-clicks C's arrow
- **THEN** the data is sorted by C ascending only

### Requirement: Sort bar shows and edits the sort
While sorted, the bar SHALL show "Sorted by" and a chip per sort column in priority order, with a direction toggle and a remove button. Chips SHALL be reorderable by dragging. An "Add column" picker SHALL list the sortable columns not yet sorted by. Clear SHALL remove the sort and close the search.

#### Scenario: Reorder priority
- **WHEN** the user drags the chip for B before the chip for A
- **THEN** the data is sorted by B, then A

#### Scenario: Remove the last chip
- **WHEN** the user removes the only sort chip and no search is open
- **THEN** the data is displayed unsorted and the bar closes

#### Scenario: Picker opens instantly
- **WHEN** the user opens the "Add column" picker
- **THEN** a jamovi variable list opens without the platform's native select popup delay, and choosing a column sorts by it immediately

### Requirement: Edited rows stay in place
Editing cells, pasting and appending rows while sorted SHALL NOT move rows. When edits leave rows out of order, the bar SHALL show a Re-sort button that re-sorts the rows. Changing the sort or the filters SHALL re-sort immediately.

#### Scenario: Edit out of order
- **WHEN** the data is sorted by `score` ascending and the user changes the first row's score to the highest value
- **THEN** the row stays where it is and Re-sort appears

#### Scenario: Re-sort
- **WHEN** the user presses Re-sort
- **THEN** the rows are re-sorted and Re-sort disappears

### Requirement: Row insert and delete blocked while sorted
While the data is sorted, inserting rows and deleting rows SHALL be disabled, and the server SHALL reject such requests with an explanatory error. Appending rows below the data SHALL remain possible. Appended rows SHALL be displayed last until sorted.

#### Scenario: Insert disabled
- **WHEN** the data is sorted
- **THEN** the Insert and Delete row actions are disabled

#### Scenario: Typing below the data
- **WHEN** the data is sorted and the user types into the first empty row
- **THEN** a new row is appended and shown where it was typed

### Requirement: Sort changes are undoable
Changing the sort SHALL be an undoable step. Undo and redo of row operations recorded before sorting SHALL still apply to the correct data set rows.

#### Scenario: Undo a sort
- **WHEN** the user sorts by A and then presses undo
- **THEN** the data is displayed in its previous order
