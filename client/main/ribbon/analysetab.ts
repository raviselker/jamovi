
'use strict';

import RibbonMenu from './ribbonmenu';
import RibbonTab, { RibbonItem } from './ribbontab';
import Placeholder from './placeholder';
import interactionManager from '../../common/interactionmanager';

import { Modules } from '../modules';
import Settings from '../settings';

export class AnalyseTab extends RibbonTab {
    buttons: RibbonItem[] = [ ];

    constructor(public modules: Modules, public settings: Settings) {
        super('analyses', 'A', _('Analyses'));
        this.modules = modules;
        this.buttons = [ ];

        this.modules.on('moduleVisibilityChanged', this._onModuleVisibilityChanged, this);
        this.modules.on('modulesChanged', this.update, this);

        this.populate();
    }

    _onModuleVisibilityChanged(module) {
        if (module.visible)
            this._showModule(module.name);
        else
            this._hideModule(module.name);
    }

    _hideModule(name: string) {
        for (let i = 0; i < this.buttons.length; i++) {
            let button = this.buttons[i];
            if (button instanceof RibbonMenu)
                button.hideModule(name);
        }
    }

    _showModule(name: string) {
        for (let i = 0; i < this.buttons.length; i++) {
            let button = this.buttons[i];
            if (button instanceof RibbonMenu)
                button.showModule(name);
        }
    }

    override async getRibbonItems() {
        this.buttons = [ ];
        if ( ! this.modules)
            return this.buttons;

        let modules = this.modules.get('modules');

        let menus = { };
        for (let module of modules) {
            let _translate = await module.getTranslator;
            let isNew = module.new;
            for (let analysis of module.analyses) {
                if (analysis.category !== undefined && analysis.category !== 'analyses')
                    continue;

                let groupName = analysis.menuGroup;
                let subgroup = analysis.menuSubgroup;
                let menu = groupName in menus ? menus[groupName] : { _title: _translate(analysis.menuGroup) };
                if (analysis.ns === 'jmv' || menu.ns !== 'jmv')
                    menu.ns = analysis.ns;

                menu._new = isNew;
                let submenu;
                if (subgroup in menu)
                    submenu = menu[subgroup];
                else
                    submenu = { name: subgroup, title: _translate(subgroup), items: [ ] };
                let item = {
                    name: analysis.name,
                    ns: analysis.ns,
                    title: _translate(analysis.menuTitle),
                    subtitle: _translate(analysis.menuSubtitle),
                    moduleName: module.name,
                    new: isNew,
                    hidden: module.visible === false,
                    resultsTitle: analysis.title
                };
                submenu.items.push(item);
                menu[subgroup] = submenu;
                menus[groupName] = menu;
            }
        }

        let shortcutIndex = 1;
        for (let groupName in menus) {
            let menu = menus[groupName];

            let flattened = [ ];
            let containsNew = menu._new;
            for (let subgroup in menu) {
                if (subgroup === '_new' || subgroup === '_title' || subgroup === 'ns')
                    continue;
                flattened.push({
                    name: subgroup,
                    title: menu[subgroup].title,
                    type: 'group',
                    items: menu[subgroup].items });
            }

            if (flattened.length > 0 && flattened[0].name === '') {
                let items = flattened.shift().items;
                flattened = items.concat(flattened);
            }

            let keyTipKey = menu.ns === 'jmv' ?  (shortcutIndex++).toString() : null;
            let buttonId2 = interactionManager.nextAriaId('button');
            let button = new RibbonMenu(menu._title, groupName, keyTipKey, flattened, false, containsNew);
            button.setAttribute('id', buttonId2);
            this.buttons.push(button);
        }

        if (this.settings.attributes.settingsRecieved === false) {
            this.buttons.push(new Placeholder('exploration', _('Exploration')));
            this.buttons.push(new Placeholder('t-tests', _('T-Tests')));
            this.buttons.push(new Placeholder('anova', _('ANOVA')));
            this.buttons.push(new Placeholder('regression', _('Regression')));
            this.buttons.push(new Placeholder('frequencies', _('Frequencies')));
            this.buttons.push(new Placeholder('factor', _('Factor')));
        }

        return this.buttons;
    }

    public _analysisSelected(analysis: { name: string, ns: string, title: string }) {
        this.emit('analysisSelected', analysis);
    }
}

export default AnalyseTab;
