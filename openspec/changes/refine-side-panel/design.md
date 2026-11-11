# Design

## Context

See proposal.md for the motivation. Specs: `side-panel-rail`, `side-panel-search`, `analyses-panel`, `module-library-panel`, `help-panel`, `settings-panel`, `account-panel`.

- The side panel lives in `client/main/auxiliary/`. `AuxShell` owns the rail (`AuxToolbar`) and the panel (`AuxPanel`); each entry registers an `AuxView` in `registry.ts`. Its state is on `#main-view` as `data-aux-presentation` (hidden, overlay, docked) and `data-aux-side`.
- Focus is managed by `common/interactionmanager`, which registers the rail and the panel as focus loops.
- Reference implementation: branch `side-panel-refinements` on `raviselker/jamovi`.

## Goals / Non-Goals

**Goals:**
- The side panel reads as part of jamovi: its colours, type sizes, radii and shadows.
- One rule for the rail: it holds app-level tools that aren't tied to one pane, and every button opens a panel.
- Every panel's search box looks and behaves the same.

**Non-Goals:**
- A shared search box for the rest of jamovi (variables view, backstage, the options panel's variable list). Deferred; `search.ts` is the starting point.
- The account panel's real data and sign-out, which come from jamovi cloud's auth module.
- Reordering the rail's buttons by dragging, which the app keeps switched off.

## Decisions

### The rail is always shown
A Gmail-style handle that collapsed the rail was built and dropped: the entries are important enough to stay in view, and the rail is narrow.

### Only app-level entries in the rail
A results outline belongs in the results pane, since it means nothing without it; data transforms belong with the variables. A notifications entry was dropped: most of jamovi's notifications are short-lived toasts, so an inbox would usually be empty.

### The Analyses panel is an expanding list
Tiles per module were tried, first with the analyses below the grid (pushed off screen by many modules), then opening under the tile's row. Both were dropped for a list of module rows, each a native `<details>`, which stays short with many modules and gets keyboard and screen reader support from the browser. Several rows can be open at once, and which are open is kept as the list is rebuilt.

### The ribbon toggle sits beside the row's summary, not in it
Interactive content inside `<summary>` would also expand the row and is invalid for screen readers. The eye button is a sibling positioned over the summary's end, which reserves room for it.

### One place for each job
The Analyses panel runs analyses and shows or hides modules; the Module Library installs, updates and removes them. The Library's Hide/Show and "Analyses (n)" list were removed so that each job has one home.

### Settings is a rail entry, fixed at the bottom
It replaces the kebab, which sat next to the rail and opened a panel from the same edge. It is placed with `margin-top: auto`; the Account entry, when shown, takes that space above it. This only holds while reordering is off (see the `shortcut:` comment in the settings stylesheet).

### Account is a panel, not a popover
A popover sized to its content was considered. A panel keeps the rule that every rail button opens a panel, and leaves room for more (storage, plan limits).

### The account's button follows `auth.events()`
The rail is built before `auth.init()` runs, so the button checks `currentUser()` when created and again whenever `auth.events()` reports something. This assumes the cloud's events stream reports sign in and sign out (see the `shortcut:` comment in the account view).

### Rail clicks don't take focus
The focus manager pulls focus back into a loop for 200 ms after focus enters it. A click focused the rail button, so a panel switched to while the panel was already open lost the focus its view gave its search box. The rail's buttons prevent the default on `mousedown`, so a click leaves focus for the view; keyboard activation is unaffected.

### Matching ignores accents
Text and search are compared after Unicode decomposition with combining marks removed, and lowercased, so "médiation" matches "mediation". Highlighting maps each normalised character back to the original text, so the marked text is the user's own.

### Help follows until you navigate
Help was always tied to the selected analysis, so a page couldn't be kept open while setting up an analysis, or opened before one existed. It now follows only until the user navigates (the home, a link, the breadcrumb), and a target button beside the pin, like the filled pin, shows and switches following. A status strip above the page was considered and dropped: clearer, but it takes a line from the document. The button is added through `AuxView.getPanelActions`, which the panel shows only while that view is.

### The help home reuses the Analyses panel's rows
Same expanding module rows and search, without the ribbon toggle, so both panels look and work alike. A module counts as having help when it has a `docs/index.md`; topics aren't listed, since the server can't list a module's docs, and are reached from the module's overview.

## Risks / Trade-offs

- **Run closes an unpinned panel:** running an analysis moves focus to its options, which closes the overlay. The page is still there when Help is reopened, and a pinned panel stays open.

- **Cloud auth contract:** the `IUser` fields (name, email, plan, picture, manageUrl) are a guess at what jamovi cloud's user carries. → Confirm with the cloud auth module's owner; the account view only reads those fields.
- **Two user buttons in the cloud:** the ribbon's `#jmv-user-button`, which the cloud fills today, is still there. → The cloud should stop filling it, then it can be removed.
- **Settings is fixed by CSS only:** if rail reordering is switched on, the Settings and Account buttons could be dragged. → Leave them out of reordering if it's switched on.
- **The language list and zoom are desktop only:** the Application group is built only when `host.isElectron`, and wasn't seen running.
