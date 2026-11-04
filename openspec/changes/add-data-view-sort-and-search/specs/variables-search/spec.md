# Spec Delta

## Purpose

Lets users narrow the variables view's list of variables by name or description, with a search field that looks and behaves like the data view's.

## ADDED Requirements

### Requirement: Always-visible variable search
The variables view SHALL show a search bar above the variable list at all times. A variable SHALL be listed when its name or description contains the text, ignoring case.

#### Scenario: Filtering by description
- **WHEN** the user types "age" in the variables view search
- **THEN** only variables whose name or description contains "age" are listed

### Requirement: Same look as the data view search
The variables search field SHALL use the data view search field's style: a rounded field with a magnifier glyph, a × clear button and a match count beside it. The bar, field height, padding and glyph position SHALL be the same as the data view's sort/search bar.

#### Scenario: Switching views
- **WHEN** the user switches between the data view with its search bar open and the variables view
- **THEN** the bars and search fields line up in height, padding and position

### Requirement: Keyboard and count behaviour
Ctrl/Cmd+F in the variables view SHALL focus the field. Typing SHALL filter about 250 ms after the user stops, and Enter immediately. Esc SHALL clear the text. While searching, the count SHALL read "1 variable" or "N variables".

#### Scenario: Ctrl+F
- **WHEN** the variables view is shown and the user presses Ctrl/Cmd+F
- **THEN** the search field is focused

#### Scenario: Count
- **WHEN** a search lists three variables
- **THEN** the count reads "3 variables"
