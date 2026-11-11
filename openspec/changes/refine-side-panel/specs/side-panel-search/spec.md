# Spec Delta

## Purpose

One search box, and one way of matching, for every side panel panel that searches.

## ADDED Requirements

### Requirement: One search box
Every side panel panel with a search SHALL use the same search box: a field with a magnifier glyph, a placeholder naming what is searched ("Search analyses", "Search modules"), and a × clear button shown only while there is text. Its border SHALL turn blue while it has focus.

#### Scenario: Typing
- **WHEN** the user types in a panel's search box
- **THEN** the × clear button appears, and the panel's list is narrowed as they type

#### Scenario: Clearing with the button
- **WHEN** the user clicks ×
- **THEN** the text is cleared, the full list is shown, and focus stays in the search box

### Requirement: Escape clears first
Escape in a search box with text SHALL clear it and leave the panel open. Escape in an empty search box SHALL close the panel as Escape does elsewhere in it.

#### Scenario: Escape twice
- **WHEN** the search box holds "anova" and the user presses Escape twice
- **THEN** the first press clears the search and the second closes the panel

### Requirement: Matching
A search SHALL match text that contains it, ignoring case, accents and leading or trailing spaces.

#### Scenario: Accents
- **WHEN** the user searches the Module Library for "médiation"
- **THEN** the same modules are listed as for "mediation"

### Requirement: Highlighting
Where a panel lists matching text, the matched part SHALL be highlighted, in the text as written (with its own case and accents).

#### Scenario: Highlighted analysis
- **WHEN** the user searches the Analyses panel for "anova"
- **THEN** "ANOVA" is highlighted in each listed analysis
