# Spec Delta

## Purpose

The Help panel: browsing every module's help, following the selected analysis or staying on a page, and the look of a help document, matched to jamovi's results.

## ADDED Requirements

### Requirement: Results-style documents
A help document's title SHALL be bold blue (#3E6DA9) at 140 %, and its section headings blue at 130 %, as the results' headings are. Its tables SHALL be ruled as results tables are: a dark rule above and a heavier one below the table, one below the header row, and no cell borders. Inline code SHALL be in jamovi's monospace font on a light grey background. Links and the breadcrumb SHALL be blue.

#### Scenario: A document with a table
- **WHEN** the user opens the help for ANOVA, which has a table of its options
- **THEN** the table is ruled like a results table, and the headings are blue

### Requirement: Help home
With no analysis selected, or from the breadcrumb's "Help", the panel SHALL show the help home: a search box and every installed module as an expanding row, as in the Analyses panel but without the ribbon toggle. A module with help SHALL expand to "Overview" (its index.md) and its analyses; one without SHALL say "No help yet". Searching SHALL list the analyses with help that match, with their module's name beside them.

#### Scenario: A module without help
- **WHEN** the user opens the help home
- **THEN** jmv expands to Overview and its analyses, and scatr says "No help yet"

### Requirement: Following the selected analysis
A target button beside the pin SHALL say whether the panel follows the selected analysis: filled and blue while it does, outlined while not, pressed (aria-pressed) while following. While following, the panel SHALL show the selected analysis' help. Opening a page from the help home, a link or the breadcrumb SHALL stop following, so the page stays as other analyses are selected. Clicking the button SHALL switch following on or off; switched on, the selected analysis' help (or the home) is shown.

#### Scenario: Setting up an analysis from its help
- **WHEN** the user opens ANOVA from the help home, then selects another analysis
- **THEN** the ANOVA page stays, and the target button is outlined

### Requirement: Breadcrumb and Run
While not following, a document SHALL have a breadcrumb starting with "Help" (the home), and an analysis' document SHALL have a "Run {analysis}" button that runs it, leaving the page as it is.

#### Scenario: Running from its help
- **WHEN** the user clicks "Run ANOVA" on the ANOVA page
- **THEN** an ANOVA analysis is created, and the Help panel still shows the ANOVA page
