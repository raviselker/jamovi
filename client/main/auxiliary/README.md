# Auxiliary Panel

The auxiliary panel is the secondary panel system used by the main client UI. It is made from three layers:

- `shell.ts`, `panel.ts`, and `toolbar.ts` manage placement, panel visibility, toolbar buttons, docking/overlay state, resizing, and focus behavior.
- `types.ts` defines the shared contracts: `AuxView`, `AuxViewId`, `AuxEntry`, and `AuxEntryContext`.
- `registry.ts` lists the available entries, controls their order, and creates the runtime `AuxView[]` used by the shell.

Shared aux panel styling lives in `style.css`. Entry-specific styling should live with the entry, not in `style.css` or `jamovi.css`.

## Aux Views

Every aux page extends `AuxView` from `types.ts`.

An `AuxView` owns:

- `id`: the stable `AuxViewId` used for toolbar state and selection.
- `getTitle()`: the toolbar and panel label.
- `getIconSvg()`: the toolbar icon markup.
- `getBody()`: creates the entry body.
- `update()`: refreshes an already-created body.
- `onMount()`: runs once after the body is inserted.
- `onShow()` / `onHide()`: runs when the view becomes visible or hidden.
- `listen(target, eventName, handler)`: registers a model listener, which is removed when the view is disposed. `addCleanup()` registers any other disposal work.
- `requestUpdate()`: use as the handler for model changes. It updates the view if it's showing; a hidden view isn't updated, and catches up in `onShow()`, so views should call `update()` from `onShow()`.

`AuxView.createPanelElement()` wraps the body in the standard panel container. The panel as a whole is a single focus loop, so Tab moves through the panel's header buttons and the active view's content together. Entry code should usually build only the body content returned by `getBody()`.

## Entry Registry

`registry.ts` is the source of truth for which aux entries exist and the order they appear in the toolbar.

Entries are sorted by `order` before being created:

```ts
export const auxEntries: AuxEntry[] = [
    modulesEntry,
    helpEntry,
];
```

Use gaps between order values so new entries can be inserted without renumbering everything.

An entry may also give a `width`, the overlay panel's width in pixels when it's first shown; without one it gets the shell's default (320). As an overlay each entry keeps its own width: resizing the panel changes the width of the entry showing, and switching entries switches to theirs (clamped to the panel's allowed range). Docked (pinned), the panel is part of the layout, so it keeps one width whatever it's showing: it's pinned at the size it is, and resizing it then changes that docked width.

By default, the toolbar buttons can be reordered by dragging them, or with Ctrl+ArrowUp/ArrowDown. Pass `{ reorderable: false }` to the `AuxShell` constructor to fix them in their registered order, or call `setReorderable()` at runtime; disabling reordering puts the buttons back in their registered order.

The `AuxEntryContext` passed to every entry contains:

- `instance`: the main client `Instance`.
- `selection`: the data set `Selection`.

Only use the parts of the context that the entry needs.

## Bundled Entries

New substantial entries should be contained bundles under `entries/<entry-id>/`.

Recommended layout:

```text
entries/
  example/
    index.ts
    view.ts
    style.css
```

`index.ts` exports the entry descriptor and imports any entry-local CSS:

```ts
import type { AuxEntry } from '../../types';
import ExampleAuxView from './view';
import './style.css';

const entry: AuxEntry = {
    id: 'example',
    order: 145,
    create: ({ instance }) => new ExampleAuxView(instance),
};

export default entry;
```

`view.ts` exports the `AuxView` implementation. Its imports should be relative to the bundle location. For example, from `entries/example/view.ts`, shared aux types are imported from `../../types`.

`style.css` should contain only selectors for that entry. Prefix entry classes with the entry name, such as `.aux-example-*`, to avoid leaking styles into other entries.

## Adding An Entry

1. Add the new id to `AuxViewId` in `types.ts`.
2. Create `entries/<entry-id>/index.ts`.
3. Create `entries/<entry-id>/view.ts` and extend `AuxView`.
4. Add `entries/<entry-id>/style.css` if the entry needs custom styles.
5. Import the entry descriptor in `registry.ts`.
6. Add it to `auxEntries` with an `order` value.
7. Run the client build to catch import, type, and CSS bundling issues.

## Removing An Entry

1. Remove the entry from `auxEntries` in `registry.ts`.
2. Remove its import from `registry.ts`.
3. Remove the id from `AuxViewId` in `types.ts` if no code still references it.
4. Delete the entry folder or view file.
5. Search for stale references to the id and any entry-specific CSS prefix.

## Translation

Use the global `_()` and `n_()` functions directly for user-facing text, with a string literal as the first argument. The i18n extractor only recognises these calls, so text passed through a wrapper or a variable will not reach the translation catalog.

Write whole sentences rather than assembling them from separately translated fragments, and use `n_()` for any text containing a count.

## Building DOM

Build view content with `common/htmlelementcreator.ts` rather than `document.createElement` chains or `innerHTML`:

- `h(tag, attributes, ...children)` for structure. String children become text nodes, so translated and other untrusted text is passed as a child, never interpolated into markup.
- `htmlTrusted()` only for fixed internal markup, such as a view's icon SVG.
- `rich()`, `richParagraphs()` and `setRich()` for untrusted rich text, such as module descriptions.

`AuxView.createBodyElement(...children)` wraps the given nodes in the view's body element.

## CSS Rules

- Put shared shell/panel/toolbar/list styling in `style.css`.
- Put entry-specific CSS in `entries/<entry-id>/style.css`.
- Do not add aux CSS to `jamovi.css`.
- Keep selectors entry-scoped unless they intentionally target shared aux structure.
- Prefer stable dimensions for toolbar buttons, cards, icons, filters, and controls to prevent layout shifts.

## Validation

The main validation command for aux client changes is:

```powershell
cd client
npm run build
```

This catches broken imports, missing CSS declarations, and invalid asset paths in bundled entry CSS. It also copies the server's `jamovi.proto` to `assets/coms.proto` before building; running vite directly skips that step, leaving the client with a stale copy of the protocol when it has changed (such as new module commands).

## Placeholder Entries

`placeholders/` holds entries that are only for show, sketching the kinds of thing the panel could hold. They're registered together, with one line in `registry.ts`. To remove them, delete the folder, that line, and their ids from `AuxViewId` in `types.ts`.
