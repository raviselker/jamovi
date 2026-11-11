# Spec Delta

## Purpose

The application's preferences, in the side panel. Replaces the ribbon's application (kebab) menu.

## ADDED Requirements

### Requirement: Settings in the rail
Settings SHALL open from a gear at the bottom of the rail. The ribbon SHALL NOT have the application (kebab) menu. Alt+M SHALL open the Settings panel.

#### Scenario: Alt+M
- **WHEN** the user presses Alt+M
- **THEN** the Settings panel opens

### Requirement: Groups
The panel SHALL group the settings under blue headings, each setting a label with its control beside it:
- **Results:** Number format, p-value format, Decimal symbol, References, Syntax mode.
- **Plots:** Plot theme, Color palette.
- **Import:** Default missings.
- **Application** (desktop app only): Zoom, Language, Developer mode, and the version.

#### Scenario: In a browser
- **WHEN** jamovi runs in a browser
- **THEN** the Settings panel shows Results, Plots and Import, and no Application group

### Requirement: Same as the application menu
The settings SHALL offer the same values, and have the same effects, as the application menu did. Choosing the "I ♥ SPSS" or "Black & white" plot theme SHALL also choose its palette, and changing the language SHALL ask for a restart.

#### Scenario: Black & white
- **WHEN** the user chooses the "Black & white" plot theme
- **THEN** the color palette changes to "Greys"

### Requirement: Applied as they change
A change SHALL apply as it is made, and the panel SHALL follow changes made elsewhere. Default missings SHALL apply when the field loses focus or Enter is pressed.

#### Scenario: Number format with the panel pinned
- **WHEN** the panel is pinned and the user sets Number format to "4 dp"
- **THEN** the results update to four decimal places, with the panel still open
