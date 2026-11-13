# Proposal

## Why

People come to jamovi needing help of every kind: making sense of a file someone else set up, choosing an analysis for their question, running it, and writing it up. Today that help lives outside jamovi. An assistant in the side panel can see the open file (its data, analyses, options and results) and help with all of these in one place, by conversation.

It should work much like Copilot's chat in VS Code: sometimes you only want to talk about your analysis, sometimes to plan, and sometimes to have an agent make the changes.

This change specifies the assistant's panel and behaviour. It is not scheduled for implementation; it builds on the side panel specified in `refine-side-panel`.

## What Changes

- **An Assistant entry** at the top of the side panel's rail (a sparkle), opening a chat panel.
- **Context:** the assistant sees the open data set and the selected analysis, shown as chips above the message box; more (other analyses, variables, results) can be added.
- **Three modes**, picked under the message box: **Ask** (answers, changes nothing), **Plan** (proposes steps to review), **Agent** (makes the changes).
- **References:** analyses, variables and results in its answers are chips that go to them.
- **Changes as cards:** each change the agent makes is applied straight away and shown as a card listing what changed, with Keep and Undo; a bar above the message box keeps or undoes them all.
- **Progress:** while it works it lists its steps; Stop ends the request.
- **The user's edits win:** options the user changes while it works are kept, and said so.
- **History:** a new chat button, and a list of past chats, the open file's first.
- **Write-ups** go into the results as a note (see the open questions in design.md).

## Capabilities

### New Capabilities
- `assistant-panel`: the assistant's chat in the side panel: context, modes, changes, progress and history.

### Modified Capabilities
- None. (The rail gains an entry, which `side-panel-rail`'s entry rules already allow.)

## Impact

- **Client, side panel** (`client/main/auxiliary/`): a new `assistant` entry; the panel's header buttons (`AuxView.getPanelActions`) for new chat and history.
- **Client, analyses and data:** the agent changes options, analyses and data through the same paths the user's edits take, so undo, saving and results behave as usual.
- **A model service**, its sign-in and its costs: not specified here.
- **The .omv file**, if chats are saved with it (open question).
