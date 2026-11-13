# Spec Delta

## Purpose

An assistant in the side panel that can see the open file, and answer questions about it, plan analyses, and make changes to it, by conversation.

## ADDED Requirements

### Requirement: Assistant entry
The rail SHALL have an Assistant entry, a sparkle, above the other entries, opening a chat panel. The chat panel SHALL open wider than the other panels. An empty chat SHALL offer suggestions that fit the open file.

#### Scenario: A file with an analysis
- **WHEN** the user opens the Assistant with Tooth Growth and an ANOVA open
- **THEN** it offers to explain the file, suggest an analysis, check the ANOVA's assumptions, or write up its results

### Requirement: Context
The message box SHALL show, as chips, what the assistant is given with each message: the open data set and the selected analysis. The user SHALL be able to remove a chip, and to add analyses, variables or results.

#### Scenario: Selecting another analysis
- **WHEN** the user selects a different analysis
- **THEN** the analysis chip changes to it

### Requirement: Modes
A picker under the message box SHALL choose the mode: Ask, Plan or Agent, each with a line saying what it does. In Ask the assistant SHALL NOT change the file. In Plan it SHALL propose steps, without making them, with a button to carry them out in Agent mode. In Agent it SHALL make changes.

#### Scenario: Asking
- **WHEN** the user asks in Ask mode what an analysis tells them
- **THEN** the assistant explains it, and the file is unchanged

### Requirement: References
Analyses, variables and results named in the assistant's answers SHALL be shown as chips, and clicking one SHALL select or scroll to what it names.

#### Scenario: An analysis chip
- **WHEN** the user clicks the "ANOVA – len" chip in an answer
- **THEN** that analysis is selected and its results scrolled into view

### Requirement: Plans in the analysis' terms
A plan, and a change card, SHALL name options as the options panel does (i.e. "Fixed Factors", "Assumption Checks", "Post Hoc").

#### Scenario: A plan for a two-way ANOVA
- **WHEN** the assistant plans to add supp to an ANOVA
- **THEN** the step reads "add supp to Fixed Factors"

### Requirement: Changes as cards
In Agent mode each change SHALL be applied straight away, as if the user had made it, and shown as a card listing what changed, with Keep and Undo. Undo SHALL restore the file as it was before that change. While changes are neither kept nor undone, a bar above the message box SHALL count them, with Keep all and Undo all.

#### Scenario: Undoing a change
- **WHEN** the agent adds supp to an ANOVA's Fixed Factors and the user clicks Undo on its card
- **THEN** supp is removed from Fixed Factors and the results are as they were

### Requirement: Progress
While it works, the assistant SHALL list its steps, marking each done, under way or to come, and the send button SHALL become Stop. When it's done, the steps SHALL fold into one line saying how long it worked, which expands to show them.

#### Scenario: Stopping
- **WHEN** the user clicks Stop while the agent works
- **THEN** it stops, and the changes made so far are shown as cards

### Requirement: The user's edits win
If the user changes the file while the agent works, the agent SHALL keep the user's change, say that it did, and not count it among its own changes, so its Undo doesn't revert it.

#### Scenario: Turning on an option meanwhile
- **WHEN** the user turns on Homogeneity test while the agent is changing the same ANOVA
- **THEN** the test stays on, and the agent's card lists it as the user's

### Requirement: Write-ups
Asked to write up results, the assistant SHALL add the write-up to the results as a note beside the analysis it describes, as a change with Keep and Undo.

#### Scenario: Writing up an ANOVA
- **WHEN** the user asks for the ANOVA to be written up
- **THEN** a note with the write-up is added above the ANOVA's results

### Requirement: History
The panel's header SHALL have a New chat button and a History button. History SHALL list past chats, the open file's first, each with its mode and when it was last used, with the side panel's search box.

#### Scenario: Back to an earlier chat
- **WHEN** the user opens History and clicks an earlier chat
- **THEN** that chat is shown, and can be continued
