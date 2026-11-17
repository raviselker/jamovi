# Spec Delta

## Purpose

help.jamovi.org: the help of every module in the jamovi library, on the web, so it can be read in its own window from the desktop app and from jamovi cloud.

## ADDED Requirements

### Requirement: Built from the modules' docs
The site SHALL publish the `jamovi/docs/` of every module in the jamovi library that has them, rendered as the Help panel renders them: the results' blue headings, ruled tables and code styles.

#### Scenario: jmv's ANOVA
- **WHEN** the user opens https://help.jamovi.org/jmv/anova
- **THEN** jmv's `anova.md` is shown, styled as in the Help panel

### Requirement: Addresses
A page's address SHALL be `https://help.jamovi.org/<module>/<path>`, with the path as in the module's docs, without `.md`. A module's address alone SHALL show its overview (`index.md`), and the site's root SHALL show its home.

#### Scenario: A topic
- **WHEN** the user opens https://help.jamovi.org/jmv/topics/linear-models
- **THEN** jmv's `topics/linear-models.md` is shown

### Requirement: Sidebar
Every page SHALL have a sidebar listing every module with help, each with its Overview, its Topics and its Analyses, with the page showing marked. Modules without help SHALL say "No help yet".

#### Scenario: Reading ANOVA
- **WHEN** the user is on jmv's ANOVA page
- **THEN** ANOVA is marked in the sidebar, under jmv's Analyses

### Requirement: Breadcrumb and links
A page SHALL show a breadcrumb from the site's home, through the module, to the page. The docs' relative links SHALL lead to the pages they name.

#### Scenario: Following a link
- **WHEN** the user clicks "same underlying model" on the ANOVA page
- **THEN** jmv's linear models topic is shown

### Requirement: Search
The site SHALL have a search box in its top bar that searches every module's help by title and text.

#### Scenario: Searching for Tukey
- **WHEN** the user searches for "tukey"
- **THEN** the pages that mention Tukey are listed, with their modules
