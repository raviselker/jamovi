# Design

## Context

See proposal.md. Specs: `help-site`, and an addition to `help-panel` (specified in `refine-side-panel`). Mockups in `mockups/`, drawn in the running app with jmv's ANOVA document:

| Mockup | Shows |
|---|---|
| `tab-button.png` | The "Open in a new tab" button in the Help panel's header |
| `tab-side.jpg` | The site's page: modules down the side, search, the document on a sheet (the chosen layout) |
| `tab-plain.jpg` | The document only (not chosen) |

- Module docs are markdown under each module's `jamovi/docs/`: an `index.md` overview, a document per analysis named after it (`anova.md`), and `topics/`. The Help panel fetches them from the local server (`/modules/<name>/docs/<path>`) and renders them with `renderDoc` (`client/main/auxiliary/entries/help/render.ts`).

## Goals / Non-Goals

**Goals:**
- Help that opens the same way in the desktop app and in jamovi cloud.
- Pages that read as jamovi's: the Help panel's document styles.

**Non-Goals:**
- Running analyses from the site: it isn't connected to a jamovi session.
- Help for modules that aren't published (sideloaded or in development); the panel still shows theirs.
- The site's hosting and deployment.

## Decisions

### jamovi serves the panel; the site is for the browser
The Help panel stays as it is: the installed modules' docs, from jamovi's own server, so they match the installed versions and need no internet. help.jamovi.org is only where the "Open in a new tab" button goes.

### A website, not a page in the client
A `help.html` in the client would be served by the local server, which a page opened in the system browser from the desktop app may not reach. A site works the same from both, and needs nothing from the session. The cost is that it needs the internet, and shows the published docs rather than the installed ones (the panel still shows the installed ones, offline).

### Every library module, down the side
The site isn't tied to a user's installed modules, so its sidebar lists every published module with help (overview, topics, analyses), as the Help panel's home does, and modules without help say so.

### Addresses follow the docs' paths
`https://help.jamovi.org/<module>/<path>`, the path as in the module's docs without `.md` (`/jmv/anova`, `/jmv/topics/linear-models`), so the panel can build a page's address from what it's showing, and the docs' relative links keep working.

## Open Questions

- **Versions:** whether addresses carry the module's version (`/jmv/2.5/anova`), so an older installed module opens its own help, or the site shows the latest only.
- **Where the site's build lives**, and how it learns of a module's new release.
- **Which modules are published:** how the panel knows a module's help is on the site (i.e. from the library's metadata), to hide the button otherwise.
- **Languages:** whether translated docs are published, and how the address picks one.

## Risks / Trade-offs

- **Drift:** the site's page may differ from the installed module's help. → Versioned addresses (open question), or a note on the page saying which version it shows.
- **Offline:** the button does nothing useful without the internet. → The panel still has the help; the button could be disabled while offline.
