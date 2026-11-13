# Tasks

Not scheduled. Settle the open questions in design.md first.

## 1. Panel

- [ ] 1.1 Add the Assistant entry at the top of the rail, opening wider than other panels; verify against `mockups/chat-empty.png`
- [ ] 1.2 Add the message box with context chips, the mode picker and Send / Stop; verify against `mockups/chat-menu.png`
- [ ] 1.3 Add new chat and history to the panel's header, with the shared search box; verify against `mockups/chat-history.png`

## 2. Conversation

- [ ] 2.1 Connect a model service, sending the context the chips show
- [ ] 2.2 Render answers with reference chips that select the analysis, variable or table; verify against `mockups/chat-ask.png`
- [ ] 2.3 Render plans, and "Do it in Agent mode"; verify against `mockups/chat-plan.png`

## 3. Agent

- [ ] 3.1 Let the agent create analyses and set options through the same paths as the user's edits
- [ ] 3.2 Show each change as a card with Keep / Undo, and the Keep all / Undo all bar; verify that Undo restores the options and results
- [ ] 3.3 Show its steps while it works, and Stop; verify against `mockups/chat-working.png`
- [ ] 3.4 Keep the user's edits made while it works, and say so; verify against `mockups/chat-conflict.png`
- [ ] 3.5 Add write-ups to the results as notes; verify against `mockups/chat-report.png`
