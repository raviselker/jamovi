# Proposal

## Why

The Help panel is good for help beside the analysis, but some reading wants more room, or to stay open in its own window while working in jamovi: going through a topic, comparing analyses, or keeping a page open on a second screen. A page in the jamovi client can't be opened from the desktop app (links open in the system browser, outside the app's local server), so help needs a home on the web.

## What Changes

- **In jamovi, nothing moves:** the Help panel keeps showing the installed modules' docs, served by jamovi itself, offline too. The site is only for reading a page in a browser.
- **help.jamovi.org:** a static site with the help of every module in the jamovi library, built from each module's `jamovi/docs/` folder (the same markdown the Help panel shows).
- **"Open in a new tab"** in the Help panel's header opens the page showing there on help.jamovi.org. In the desktop app it opens the system browser; in jamovi cloud, a new tab.
- The button is shown only where the module's help is published on the site.

## Capabilities

### New Capabilities
- `help-site`: help.jamovi.org: its pages, navigation, search and addresses.

### Modified Capabilities
- `help-panel` (from `refine-side-panel`): adds the "Open in a new tab" button.

## Impact

- **A new site and its build**, outside this repository (likely beside jamovi's website): collecting the published modules' docs and rendering them.
- **Client, Help panel** (`client/main/auxiliary/entries/help/`): one header button, building the page's address and opening it with `host.openUrl`.
- **Module authors:** their `jamovi/docs/` is published when their module is.
