'use strict';

// a deployment may lay the ribbon's header out in two rows (see the lobby's
// ribbonHeader()): a leading slot spanning both, a top row of its own, and
// the tabs below it. desktop jamovi doesn't, and its header is as it was

export interface HeaderRows {
    leading: HTMLElement;
    top: HTMLElement;
    // the File menu's button says "File" (its label), not the menu icon
    fileAsText?: boolean;
}

// the header's own elements are moved, not copied: the ribbon keeps
// references to them. the account button goes last, in a slot of its own
// spanning both rows, as the leading slot does at the start
export function layoutHeaderRows(header: HTMLElement, rows: HeaderRows): void {
    const user = header.querySelector<HTMLElement>(':scope > #jmv-user-button');

    const tabsRow = document.createElement('div');
    tabsRow.className = 'jmv-ribbon-header-tabs';
    tabsRow.append(...Array.from(header.children).filter(child => child !== user));

    const column = document.createElement('div');
    column.className = 'jmv-ribbon-header-rows';
    column.append(rows.top, tabsRow);

    const trailing = document.createElement('div');
    trailing.className = 'jmv-ribbon-header-trailing';
    if (user)
        trailing.append(user);

    const file = tabsRow.querySelector<HTMLElement>(':scope > .file-tab');
    if (rows.fileAsText && file) {
        file.textContent = file.getAttribute('aria-label');
        file.classList.add('file-tab-text');
    }

    header.classList.add('jmv-ribbon-header-tworow');
    header.append(rows.leading, column, trailing);
}
