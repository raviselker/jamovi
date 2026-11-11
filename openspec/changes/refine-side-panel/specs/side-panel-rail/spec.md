# Spec Delta

## Purpose

The rail on the window's edge that opens the side panel's panels: its look, its entries, and how panels are opened, switched and pinned.

## ADDED Requirements

### Requirement: jamovi look
The rail SHALL be jamovi blue (#3E6DA9) with solid white icons, like the ribbon's tab bar. The button of the panel showing SHALL take the panel's background colour with a blue icon, like the ribbon's selected tab. The rail SHALL leave a strip of blue above its first button. The panel SHALL use jamovi's greys, 3 px radii and the results' 5 px grey shadow.

#### Scenario: A panel is open
- **WHEN** the Module Library is open
- **THEN** its rail button has the panel's light grey background and a blue icon, and the other buttons are white icons on blue

### Requirement: Always shown
The rail SHALL always be shown. There SHALL be no control to collapse it.

#### Scenario: Window opens
- **WHEN** jamovi opens
- **THEN** the rail is shown with its entries, and no panel is open

### Requirement: Entries and their order
The rail SHALL show, from the top: Analyses, Module Library and Help. At its bottom it SHALL show Account (only while a user is signed in) and Settings, with Account above Settings. The placeholder entries SHALL NOT be shown.

#### Scenario: Not signed in
- **WHEN** no user is signed in (the desktop app, or a local server)
- **THEN** the rail shows Analyses, Module Library and Help at the top and Settings alone at the bottom

#### Scenario: Signed in
- **WHEN** a user is signed in
- **THEN** their avatar is shown directly above Settings

### Requirement: Opening and switching panels
Clicking a rail button SHALL open its panel, and clicking the button of the panel showing SHALL close it. Clicking another button while a panel is open SHALL switch to that panel. When a panel is opened or switched to, focus SHALL move to its search box if it has one, otherwise to its first control, otherwise to the panel. A click on a rail button SHALL NOT itself move focus to the button. Enter or Space on a focused rail button SHALL open its panel in the same way.

#### Scenario: Switching between open panels
- **WHEN** the Analyses panel is open and the user clicks the Module Library button
- **THEN** the Module Library is shown and its search box has focus

#### Scenario: From the keyboard
- **WHEN** a rail button has focus and the user presses Enter
- **THEN** its panel opens with focus in its search box

### Requirement: Pinning
The panel's pin button SHALL dock the panel beside the data and results, and unpin it again. Unpinned it SHALL show an outline pin labelled "Pin panel"; pinned, a filled blue pin labelled "Unpin panel".

#### Scenario: Pinning
- **WHEN** the user clicks the outline pin
- **THEN** the panel is docked and the pin is shown filled, labelled "Unpin panel"
