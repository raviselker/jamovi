// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { layoutHeaderRows } from '../ribbonheader';

// the ribbon's header, as ribbon.ts builds it
function makeHeader() {
    const header = document.createElement('div');
    header.className = 'jmv-ribbon-header';
    const file = document.createElement('button');
    file.className = 'jmv-ribbon-tab file-tab';
    const tabs = document.createElement('div');
    tabs.className = 'ribbon-tabs';
    const user = document.createElement('div');
    user.id = 'jmv-user-button';
    const full = document.createElement('button');
    full.className = 'jmv-ribbon-fullscreen';
    const menu = document.createElement('div');
    menu.className = 'jmv-ribbon-menu';
    header.append(file, tabs, user, full, menu);
    return { header, file, tabs, user, full, menu };
}

describe('layoutHeaderRows', () => {
    it('puts the leading slot first, and the top row above the tabs', () => {
        const { header, file, tabs, user, full, menu } = makeHeader();
        const leading = document.createElement('div');
        const top = document.createElement('div');

        layoutHeaderRows(header, { leading, top });

        expect(header.classList.contains('jmv-ribbon-header-tworow')).toBe(true);
        expect(header.firstElementChild).toBe(leading);
        const column = header.children[1];
        expect(column.classList.contains('jmv-ribbon-header-rows')).toBe(true);
        expect(column.firstElementChild).toBe(top);
        const tabsRow = column.children[1];
        expect(tabsRow.classList.contains('jmv-ribbon-header-tabs')).toBe(true);
        expect([...tabsRow.children]).toEqual([file, tabs, full, menu]);
        // the account button moves up, to the end of the top row
        expect(top.lastElementChild).toBe(user);
    });
});
