# Spec Delta

## Purpose

The Module Library is where users find, install, update and remove modules. Running analyses and showing or hiding modules in the ribbon belong to the Analyses panel.

## ADDED Requirements

### Requirement: Getting modules only
A module card SHALL offer installing, updating and removing the module. Installed module cards SHALL NOT list the module's analyses, and SHALL NOT have a Hide or Show button.

#### Scenario: An installed module
- **WHEN** the library shows jmv, which is installed
- **THEN** its card shows its title, version, "Installed", description and authors, with no analyses list and no Hide button

### Requirement: Search covers the analyses
The library's search SHALL still match a module's analyses' titles, as well as its name, title, description and authors, so a user can find which module to install for an analysis.

#### Scenario: Searching for an analysis
- **WHEN** the user searches the library for "mediation"
- **THEN** modules with mediation analyses are listed, with the matches highlighted

### Requirement: jamovi look
Module cards SHALL have a 1 px light grey border, 3 px radius and no shadow. Each card SHALL show the module's two-letter monogram on a tile tinted in one of jamovi's colours (blue, amber, red, green, taken in turn). The title SHALL be blue; the name and version plain grey; buttons jamovi's grey buttons.

#### Scenario: Several modules
- **WHEN** the library lists four modules
- **THEN** their monogram tiles are blue, amber, red and green in turn
