# Tasks

Run the app with `docker compose --profile main build && docker compose --profile main up -d` at http://127.0.0.1:41337/. Client tests run with `npx vitest run main/auxiliary` in `client/`. Help documents need the `jmv` submodule on a commit with `jamovi/docs/` (`feature/add-help-files`).

Done on `side-panel-refinements` unless unchecked.

## 1. Rail and panel

- [x] 1.1 Restyle the rail (blue, white solid icons, active button in the panel's colour) and the panel (greys, radii, shadow, title); verify in the app with each panel open
- [x] 1.2 Hide the placeholder entries; verify the rail shows only the real entries
- [x] 1.3 Leave a strip of blue above the rail's first button; verify the active top button no longer meets the ribbon
- [x] 1.4 Show a filled pin while pinned, labelled "Unpin panel"; verify pinning and unpinning
- [x] 1.5 Keep rail clicks from moving focus to the button; verify that switching between open panels focuses the new panel's search box, both ways, and that Enter on a focused rail button still opens its panel
- [ ] 1.6 Check the rail and panel on the left side, docked, in RTL and in forced colours

## 2. Search

- [x] 2.1 Add the shared search box, matching and highlighting (`search.ts`); verify with `tests/search.test.ts`
- [x] 2.2 Use it in the Module Library and the Analyses panel; verify Escape, the clear button, accent-insensitive matches and highlights in both

## 3. Analyses panel

- [x] 3.1 Add the Analyses entry, listing installed modules as expanding rows; verify expanding, several open at once, and running an analysis
- [x] 3.2 Add search across all modules' analyses; verify "anova" lists the ANOVAs with "jmv" beside them, and "No analyses found."
- [x] 3.3 Add the eye toggle beside each row's summary; verify hiding and showing scatr keeps the row as it was and focus on the eye
- [ ] 3.4 Check that hiding a module removes its buttons from the ribbon and showing it brings them back
- [ ] 3.5 Check the panel with many installed modules

## 4. Module Library and Help

- [x] 4.1 Restyle the module cards (monogram tiles, borders, buttons); verify in the app
- [x] 4.2 Remove the analyses list and Hide/Show from installed cards; verify installed cards show neither and uninstalled cards still show Install
- [x] 4.3 Restyle help documents (blue headings, results-style tables, code); verify with the ANOVA help
- [ ] 4.4 Check a module's Remove button, and cards with updates available
- [x] 4.6 Add the help home, the follow toggle (a target beside the pin, via `AuxView.getPanelActions`), the "Help" crumb and the Run button; verify the home lists jmv and scatr ("No help yet"), that opening ANOVA stops following, that Run keeps the page, and that following again shows the selected analysis
- [ ] 4.7 List a module's topics in the help home (there's no listing of a module's docs; they're reached from its overview for now)
- [ ] 4.5 Fix help documents opening scrolled part-way down (seen on `llm_split_panel`)

## 5. Settings

- [x] 5.1 Add the Settings entry with the application menu's settings, grouped; verify the values shown and a change applied
- [x] 5.2 Remove the application menu and its key tip from the ribbon, and point Alt+M at the Settings panel
- [ ] 5.3 Check the Application group (zoom, language, developer mode) in the desktop app
- [ ] 5.4 Check Alt+M, Default missings and the plot settings

## 6. Account

- [x] 6.1 Type `currentUser()` as `IUser`, and add the Account entry, shown only with a user; verify with a temporary user in the auth stub, and hidden without one
- [ ] 6.2 Confirm the `IUser` fields and that `auth.events()` reports sign in and out with jamovi cloud's auth module
- [ ] 6.3 Stop the cloud filling the ribbon's `#jmv-user-button`, then remove it
- [ ] 6.4 Check Sign out, and a user's picture as the avatar
