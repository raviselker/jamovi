'use strict';

// a deployment may lay the ribbon's header out in two rows (see the lobby's
// ribbonHeader()): a leading slot spanning both, a top row of its own, and
// the tabs below it. desktop jamovi doesn't, and its header is as it was

export interface HeaderRows {
    leading: HTMLElement;
    top: HTMLElement;
}

// the header's own elements are moved, not copied: the ribbon keeps
// references to them. the account button goes to the end of the top row
export function layoutHeaderRows(header: HTMLElement, rows: HeaderRows): void {
    const user = header.querySelector<HTMLElement>(':scope > #jmv-user-button');

    const tabsRow = document.createElement('div');
    tabsRow.className = 'jmv-ribbon-header-tabs';
    tabsRow.append(...Array.from(header.children).filter(child => child !== user));

    if (user)
        rows.top.append(user);

    const column = document.createElement('div');
    column.className = 'jmv-ribbon-header-rows';
    column.append(rows.top, tabsRow);

    header.classList.add('jmv-ribbon-header-tworow');
    header.append(rows.leading, column);
}
