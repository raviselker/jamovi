# Tasks

Settle the open questions in design.md first. The site is built outside this repository; only 2.x is in it.

## 1. The site

- [ ] 1.1 Build the site from the published modules' `jamovi/docs/`, rendering markdown as the Help panel does; verify jmv's ANOVA page against `mockups/tab-side.jpg`
- [ ] 1.2 Add the sidebar of modules, their overviews, topics and analyses, and "No help yet"
- [ ] 1.3 Add search across every module's help
- [ ] 1.4 Keep the docs' relative links working, and the breadcrumb back to the home
- [ ] 1.5 Rebuild when a module is published

## 2. The Help panel

- [ ] 2.1 Add "Open in a new tab" first in the Help panel's header, opening the page showing on help.jamovi.org with `host.openUrl`; verify against `mockups/tab-button.png`, in the desktop app (system browser) and in a browser (new tab)
- [ ] 2.2 Hide the button for modules whose help isn't published, and on the help home open the site's home
