# Spec Delta

## Purpose

Keeps the Help panel's help served by jamovi itself, and adds opening a page on help.jamovi.org.

## ADDED Requirements

### Requirement: Served by jamovi
The Help panel SHALL show the installed modules' own docs, served by jamovi itself (`/modules/<name>/docs/<path>`), and SHALL work without the internet. It SHALL NOT load its pages from help.jamovi.org, which is only opened by the "Open in a new tab" button.

#### Scenario: Offline
- **WHEN** the user opens the Help panel without an internet connection
- **THEN** the installed modules' help is shown as usual

### Requirement: Open in a new tab
The Help panel's header SHALL have an "Open in a new tab" button, before the follow button, that opens the page showing on help.jamovi.org: in the desktop app in the system browser, in jamovi cloud in a new tab. On the help home it SHALL open the site's home. It SHALL be hidden for a module whose help isn't published on the site.

#### Scenario: Reading ANOVA in its own tab
- **WHEN** the Help panel shows jmv's ANOVA and the user clicks "Open in a new tab"
- **THEN** https://help.jamovi.org/jmv/anova opens in a browser

#### Scenario: A sideloaded module
- **WHEN** the Help panel shows the help of a sideloaded module
- **THEN** there is no "Open in a new tab" button
