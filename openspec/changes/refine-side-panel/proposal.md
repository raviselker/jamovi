# Proposal

## Why

The `llm_split_panel` branch adds a side panel: a rail of buttons on the window's edge that opens panels beside the data and results, with a Module Library and Help to start with. As it stands it doesn't look like jamovi (white rail, rounded cards, outline icons), hiding a module from the ribbon leaves its analyses reachable only from inside the Module Library, settings live in a separate slide-over behind a kebab menu, and every panel has its own search box that behaves differently.

This change makes the side panel the home for app-level tools: it restyles it in jamovi's visual language, adds an Analyses panel (an "app drawer" for every installed analysis, including those hidden from the ribbon), moves Settings and the account into it, and gives its panels one shared search box.

A working implementation exists on the `side-panel-refinements` branch of `raviselker/jamovi`, built on `llm_split_panel`. This change specifies its behaviour.

## What Changes

- **The rail** is jamovi blue with white icons. The active button takes the panel's colour, like the ribbon's selected tab. It is always shown: there is no way to collapse it.
- **The rail's entries:** Analyses, Module Library and Help at the top; the signed-in user's Account and Settings at the bottom. The placeholder entries are hidden.
- **An Analyses panel** lists every installed module as a row that expands to its analyses. Clicking an analysis runs it. An eye button on each row shows or hides the module in the ribbon. Searching lists the matching analyses from every module.
- **The Module Library** is for getting modules only: installed module cards no longer list their analyses or have a Hide/Show button. Its cards are restyled with tinted monogram tiles in jamovi's colours.
- **Help** documents use the results' look: blue headings and ruled tables. Help can be browsed, not just followed: a help home lists every module's help, a target button beside the pin says whether Help follows the selected analysis, and opening a page stops following, so it stays while the analysis is set up (with a Run button on an analysis' page).
- **Settings** move from the ribbon's kebab menu into a Settings panel; the kebab is removed. Alt+M opens the panel.
- **An Account panel**, for jamovi cloud's signed-in user, shows the user, their plan, Manage subscriptions and Sign out. Without a user its button is hidden.
- **One search box** for the side panel's panels: the same look, Escape to clear, matching that ignores case and accents, and the matches highlighted.
- **Focus:** opening a panel, or switching panels, puts focus in its search box.
- **The pin** button shows a filled pin while the panel is pinned.

## Capabilities

### New Capabilities
- `side-panel-rail`: the rail's look, its entries and their order, and opening, switching and pinning panels.
- `side-panel-search`: the search box and matching shared by the side panel's panels.
- `analyses-panel`: running any installed analysis, and showing or hiding modules in the ribbon.
- `module-library-panel`: finding, installing, updating and removing modules.
- `help-panel`: the help home, following or staying on a page, and the look of help documents.
- `settings-panel`: the application's preferences.
- `account-panel`: the signed-in user's account.

### Modified Capabilities
None. There are no existing specs in `openspec/specs/`.

## Impact

- **Client, side panel** (`client/main/auxiliary/`): shell styles, toolbar, panel, registry, the new `search.ts`, and the `analyses`, `settings` and `account` entries; the `modules` and `help` entries are restyled, and `help` gets its home and follow toggle. Views can add buttons to the panel's header (`AuxView.getPanelActions`).
- **Client, ribbon:** the application menu (`ribbon/appmenu.ts`, `appmenu.css`) and its key tip are removed; `main.ts` points Alt+M at the Settings panel.
- **Client, auth** (`auth/auth.ts`): `currentUser()` returns a typed `IUser`. jamovi cloud's auth module has to return that shape.
- **Server, protocol, file format:** none.
