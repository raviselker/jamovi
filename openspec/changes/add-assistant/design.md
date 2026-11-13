# Design

## Context

See proposal.md for the motivation. Spec: `assistant-panel`. Mockups are in `mockups/`, drawn into the running app on the Tooth Growth example with an ANOVA of len by dose only:

| Mockup | Shows |
|---|---|
| `chat-empty.png` | The empty chat: suggestions for this file, and the context chips |
| `chat-menu.png` | The Ask / Plan / Agent picker |
| `chat-ask.png` | Ask: explaining the analysis, with reference chips |
| `chat-plan.png` | Plan: steps in the analysis' own option names, handed to Agent |
| `chat-agent.png` | Agent: a change card with Keep / Undo, and Keep all / Undo all |
| `chat-report.png` | A write-up added to the results as a note |
| `chat-working.png` | Its steps while it works, and Stop |
| `chat-conflict.png` | The user changing an option while it works |
| `chat-history.png` | New chat and the chat history |
| `chat-wide.jpg` | The panel at about 480px, as an overlay |

The assistant's text and numbers in the mockups are illustrative.

- Builds on the side panel (`client/main/auxiliary/`, see `refine-side-panel`): an `AuxView` entry, its header buttons through `AuxView.getPanelActions`, and the shared search box (`search.ts`) for the history.

## Goals / Non-Goals

**Goals:**
- One place to ask about, plan and change the open file.
- Whatever the agent does, the user can see and undo, and it ends up as if they had done it: options in the options panel, analyses in the results.

**Non-Goals:**
- Choosing the model service, sign-in, pricing and usage limits.
- Running code (R or otherwise) outside jamovi's analyses.
- An assistant outside the side panel (i.e. inline in the options panel).

## Decisions

### Modes like Copilot's
Ask, Plan and Agent cover the three ways people want help: to understand, to decide, and to get it done. One picker under the message box, rather than three entries, keeps one conversation across them (a plan can be handed to Agent).

### The agent applies, then asks to keep
Changes are made straight away, so the results update while you read, and each is a card with Keep and Undo, as Copilot does with edits. Proposing first and applying on approval was the alternative; it's slower to see what a change does, and Plan already covers "show me first".

### Plans in the analysis' own terms
A plan names the options as the options panel does (Fixed Factors, Assumption Checks, Post Hoc), so it can be checked against what's on screen, and a change card lists the same.

### The user's edits win
If the user changes something while the agent works, the agent keeps the user's change, says so, and doesn't count it among its own changes, so Undo doesn't revert it.

### Pinned while chatting
At the side panel's 320px default the chat is cramped; about 480px reads well, but an overlay that wide covers the results. The assistant should open wider than other panels (`AuxEntry.width`), and chatting probably wants it pinned, so the results move over rather than being covered.

## Open Questions

- **Where write-ups and explanations live:** in the results as notes (saved and exported with them; the mockups assume this), or only in the chat.
- **Whether chats are saved in the .omv file**, so a reopened file keeps its conversations (the history mockup assumes so).
- **Asking mid-task:** how the agent asks a question while working (i.e. "dose is numeric; treat it as a factor?").
- **Errors and limits:** what's shown when the service fails or usage runs out.
- **Data privacy:** what of the data is sent to the service, and how the user is told and consents.

## Risks / Trade-offs

- **Wrong analyses that look right:** an agent can make a plausible but wrong choice. → Every change is a card listing its options, and the options are in the options panel to check.
- **Data leaving the machine:** the data set, or parts of it, would be sent to a model service. → Needs consent and a clear statement of what's sent, before anything is.
