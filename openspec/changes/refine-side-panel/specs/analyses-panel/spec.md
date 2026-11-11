# Spec Delta

## Purpose

Lets users run any installed analysis, including those of modules hidden from the ribbon, and choose which modules the ribbon shows. Like an app drawer: the ribbon is the home screen, and this lists everything.

## ADDED Requirements

### Requirement: Every installed module
The Analyses panel SHALL list every installed module, whether or not it is shown in the ribbon, as a row with: a disclosure triangle, the module's monogram tile, its name in bold blue with its title beneath, the number of its analyses, and its ribbon toggle.

#### Scenario: A hidden module
- **WHEN** a module is hidden from the ribbon
- **THEN** it is still listed in the Analyses panel, with its ribbon toggle shown as a crossed-out eye

### Requirement: Expanding a module
Clicking a module's row SHALL expand it to list its analyses, and clicking it again SHALL collapse it. Several modules MAY be expanded at once, and a module SHALL stay expanded while the list updates. An analysis in both the Analyses and the Plots menus SHALL be listed once. Analyses with the same title SHALL show their menu subtitle (i.e. "One-Way ANOVA Kruskal-Wallis").

#### Scenario: Expanding
- **WHEN** the user clicks the jmv row
- **THEN** its analyses are listed beneath it, and the other rows stay where they are

### Requirement: Running an analysis
Clicking an analysis SHALL run it, as choosing it from the ribbon does, and an unpinned panel SHALL close.

#### Scenario: Running ANOVA
- **WHEN** the user clicks ANOVA
- **THEN** an ANOVA analysis is created and its options are shown

### Requirement: Ribbon toggle
Each module's row SHALL end with an eye button: an open eye (subdued) while the module is in the ribbon, a crossed-out eye while it is not. Clicking it SHALL show or hide the module in the ribbon, without expanding or collapsing the row, and focus SHALL stay on it. Its label SHALL say what it will do.

#### Scenario: Hiding a module
- **WHEN** the user clicks scatr's open eye, labelled "Hide scatr from the ribbon"
- **THEN** scatr is hidden from the ribbon, its eye is crossed out, and its row neither expands nor collapses

### Requirement: Without permission to show and hide
Without permission to show and hide modules, a row SHALL have no ribbon toggle, and a module hidden from the ribbon SHALL show a crossed-out eye that cannot be clicked.

#### Scenario: A hidden module, no permission
- **WHEN** showing and hiding modules isn't permitted and scatr is hidden from the ribbon
- **THEN** scatr's row shows a crossed-out eye, and clicking it does nothing

### Requirement: Searching analyses
Typing in the search box SHALL replace the modules with a flat list of the analyses that match, from every module, each with its module's name beside it and the matches highlighted. An analysis SHALL match on its title, menu title or menu subtitle, and every analysis of a module whose name matches SHALL be listed. With nothing matching, the panel SHALL say "No analyses found."

#### Scenario: Not knowing the module
- **WHEN** the user searches for "anova"
- **THEN** every ANOVA analysis is listed with "jmv" beside it
