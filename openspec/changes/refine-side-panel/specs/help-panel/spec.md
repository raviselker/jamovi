# Spec Delta

## Purpose

The look of an analysis' help document in the Help panel, matched to jamovi's results.

## ADDED Requirements

### Requirement: Results-style documents
A help document's title SHALL be bold blue (#3E6DA9) at 140 %, and its section headings blue at 130 %, as the results' headings are. Its tables SHALL be ruled as results tables are: a dark rule above and a heavier one below the table, one below the header row, and no cell borders. Inline code SHALL be in jamovi's monospace font on a light grey background. Links and the breadcrumb SHALL be blue.

#### Scenario: A document with a table
- **WHEN** the user opens the help for ANOVA, which has a table of its options
- **THEN** the table is ruled like a results table, and the headings are blue
