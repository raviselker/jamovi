'use strict';

import interactionManager, { keyTips, type IKeyTipTokenOptions } from '../../common/interactionmanager';
import Menu from '../../common/menu';
import { h, rich }  from '../../common/htmlelementcreator';
import { RibbonItem } from './ribbontab';
import AnalyseTab from './analysetab';

class RibbonMenu extends HTMLElement implements RibbonItem {
    focusId: string;
    title: string;
    name: string;
    containsNew: boolean;
    dock: 'right' | 'left';
    keyTipKey: string;
    labelId: string;
    items: any;
    menu: Menu;
    parent: AnalyseTab;
    hidden: boolean = false;

    constructor(title:string, name:string, keyTipKey:string, items: any[], right: boolean, containsNew: boolean) {
        super();
        this.classList.add('jmv-ribbon-button');
        this.classList.add('jmv-analyses-button');
        this.setAttribute('tabindex', '0');
        //this.focusId = interactionManager.getNextFocusId();
        //this.setAttribute('data-focus-id', this.focusId);
        this.setAttribute('role', 'menuitem');

        this.title = title;
        this.name = name;
        this.items = items;
        this.containsNew = containsNew;
        this.dock = right ? 'right' : 'left';
        this.keyTipKey = keyTipKey;

        this.labelId = interactionManager.nextAriaId('label');
        this.setAttribute('aria-labelledby', this.labelId);

        if (keyTipKey) {
            let keySplit = keyTipKey.split('-');
            let keyTipOptions: IKeyTipTokenOptions = { key: keySplit[0].toUpperCase(), action: event => this._clicked(event, false) };
            keyTips.register(this, keyTipOptions);
        }

        this.setAttribute('data-name', this.name.toLowerCase());
        if (containsNew)
            this.classList.add('contains-new');
        if (right)
            this.classList.add('right');

        this.addEventListener('mousedown', event => {
            if (this.menu)
                this._clicked(event, event.detail > 0);
        });
        this.addEventListener('mouseup', event => {
            if ( ! this.menu)
                this._clicked(event, event.detail > 0);
        });
        this.addEventListener('keydown', (event) => {
            if ((event.altKey && event.code == 'ArrowDown') || event.code === 'Enter' || event.code === 'Space')
                this._clicked(event, false);
        });

        this._refresh();
    }

    setParent(parent: AnalyseTab, parentKeyTipPath) {
        this.parent = parent;

        if (this.keyTipKey)
            keyTips.register(this, { path: parentKeyTipPath });
    }

    setEnabled(enabled:boolean) {
        this.setAttribute('aria-disabled', (! enabled).toString());
    }

    _notifySelected(name: string, ns: string, title: string) {
        this.parent._analysisSelected({ name, ns, title });
        this.hideMenu();
    }

    hideMenu(fromMouse: boolean=false) {
        this.menu.hide(fromMouse);
    }

    showMenu(fromMouse=false) {
        this.positionMenu(fromMouse);
    }

    hideModule(name:string, item?) {
        if (item === undefined)
            item = this;

        let changed = false;
        if (item.moduleName === name)
            changed = true;

        if (item.items && item.items.length > 0) {
            let allHidden = true;
            for (let child of item.items) {
                this.hideModule(name, child);
                if ( ! child.hidden)
                    allHidden = false;
            }
            if (allHidden)
                changed = true;
        }

        if (changed) {
            item.hidden = true;
            let el: HTMLElement;
            if (item instanceof HTMLElement)
                el = item;
            else
                el = item.el;
            if (el)
                el.classList.add('menu-item-hiding');
        }
    }

    showModule(name:string, item?) {
        if (item === undefined)
            item = this;

        let changed = false;
        if (item.moduleName === name)
            changed = true;

        if (item.items) {
            let allHidden = true;
            for (let child of item.items) {
                this.showModule(name, child);
                if ( ! child.hidden)
                    allHidden = false;
            }
            if (allHidden === false)
                changed = true;
        }

        if (changed) {
            item.hidden = false;
            if (item.hidden === false) {
                let el: HTMLElement;
                if (item instanceof HTMLElement)
                    el = item;
                else
                    el = item.el;
                if (el)
                    el.classList.remove('menu-item-hiding');
            }
        }
    }

    _toggleMenu(fromMouse=false) {
        if (this.menu.isVisible())
            this.hideMenu(fromMouse);
        else
            this.showMenu(fromMouse);
    }

    _clicked(event, fromMouse=false) {
        if (this.menu.contains(event.target))
            return;

        this._toggleMenu(fromMouse);
        event.preventDefault();
    }

    _itemClicked(event) {
        let source = event.currentTarget;
        this._notifySelected(
            source.dataset.name,
            source.dataset.ns,
            source.dataset.rtitle);
        source.classList.remove('new');
        event.stopPropagation();
    }

    _createMenuItem(item, level:number) {
        let classes = 'jmv-ribbon-menu-item';
        if (item.new)
            classes += ' new';
        if (item.hidden)
            classes += ' menu-item-hiding';

        let labelId1 = interactionManager.nextAriaId('label');
        let labelId2 = '';
        if (item.subtitle && item.subtitle !== item.title)
            labelId2 = interactionManager.nextAriaId('label');

        let description = h('div', { class: 'description' },
            h('div', { id: labelId1 }, rich(item.title)));
        if (item.subtitle)
            description.append(h('div', { id: labelId2, class: 'jmv-ribbon-menu-item-sub' }, rich(item.subtitle)));

        item.el = h('button', {
            role: 'menuitem',
            'aria-labelledby': `${labelId1} ${labelId2}`,
            'data-name': item.name,
            'data-ns': item.ns,
            'data-title': item.title,
            'data-rtitle': item.resultsTitle,
            class: classes,
            tabindex: '0'
        }, description);

        interactionManager.createHoverItem(item.el);

        return item.el;
    }

    _createMenuGroup(group, level:number) {
        let labelId = interactionManager.nextAriaId('label');
        let groupElement = h('div', { class: 'jmv-ribbon-menu-group',  role: 'group', 'aria-labelledby': labelId },
                                h('label', { class: 'jmv-ribbon-menu-heading', id: labelId }, rich(group.title))
                            );

        let itemsElement = h('div', { class: 'jmv-group-items', role: 'presentation' });

        let allHidden = true;
        for (let i = 0; i < group.items.length; i++) {
            itemsElement.append(this._createMenuItem(group.items[i], level));
            if ( ! group.items[i].hidden)
                allHidden = false;
        }

        if (allHidden) {
            group.hidden = true;
            groupElement.classList.add('menu-item-hiding');
        }
        groupElement.append(itemsElement);

        group.el = groupElement;
        return groupElement;
    }

    _refresh() {

        let html = '';

        let iconElement = h('div', { class: 'jmv-ribbon-button-icon' });
        let labelElement = h('div', { class: 'jmv-ribbon-button-label', id: this.labelId}, rich(this.title || ''));

        if ( ! this.menu) {
            this.menu = new Menu(this, 1, { className: 'analysis-menu', exitKeys: [ 'Alt+ArrowUp' ] });
            this.menu.addEventListener('menu-shown', (event) => {
                this.classList.remove('contains-new');
            });
        }

        let menuElement = this.menu;

        menuElement.innerHTML = '';
        let allHidden = true;
        for (let i = 0; i < this.items.length; i++) {
            let item = this.items[i];
            if (item.type === 'group')
                menuElement.append(this._createMenuGroup(item, 1));
            else
                menuElement.append(this._createMenuItem(item, 1));
            if ( ! item.hidden)
                allHidden = false;

            if (item.getMenus) {
                let subMenus = item.getMenus();
                for (let subMenu of subMenus){
                    if (!subMenu.connected)
                        subMenu.connect(this.menu);
                }
            }
        }

        while (this.firstChild)
            this.removeChild(this.firstChild);
        this.append(iconElement);
        this.append(labelElement);
        this.append(h('div', { class: 'jmv-ribbon-menu-arrow', style: 'margin: 7px 0 0 0;' }));

        if (allHidden) {
            this.classList.add('menu-item-hiding');
            this.hidden = true;
        }

        menuElement.querySelectorAll('.jmv-ribbon-menu-item').forEach(item => {
            item.addEventListener('click', (event: MouseEvent) => this._itemClicked(event));
        });
    }

    getMenus() {
        if (this.menu)
            return [ this.menu ];
        return [];
    }

    positionMenu(fromMouse=false) {
        let anchor = 'left';
        let rect = this.getBoundingClientRect();
        let x = rect.left + window.scrollX;
        let y = rect.top + window.scrollY + this.offsetHeight;
        if (getComputedStyle(this).direction === 'rtl')
            x += rect.width;

        this.menu.show(x, y, { withMouse: fromMouse });
    }
}

customElements.define('jmv-ribbon-modulemenu', RibbonMenu);

export default RibbonMenu;
