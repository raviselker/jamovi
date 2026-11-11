
'use strict';

import RibbonMenu from './ribbonmenu';
import RibbonTab, { RibbonItem } from './ribbontab';
import Placeholder from './placeholder';
import RibbonButton from './ribbonbutton';
import interactionManager from '../../common/interactionmanager';
import RibbonSeparator from './ribbonseparator';
import { Modules } from '../modules';
import Settings from '../settings';
import { RibbonModel } from '../ribbon';


class PlotsTab extends RibbonTab {
    buttons: RibbonItem[] = [ ];
    settings: Settings;
    modules: Modules;
    _moreIndex: number = -1;

    constructor(modules: Modules, model: RibbonModel) {
        super('plots', 'P', _('Plots'));
        this.modules = modules;
        this.settings = model.settings();

        this.modules.on('moduleVisibilityChanged', this._onModuleVisibilityChanged, this);
        this.modules.on('modulesChanged', this.update, this);

        this.populate();
    }

    private _onModuleVisibilityChanged(module) {
        if (module.visible)
            this._showModule(module.name);
        else
            this._hideModule(module.name);
    }

    private _hideModule(name) {
        for (let i = 0; i < this.buttons.length; i++) {
            let button = this.buttons[i];
            if (button instanceof RibbonMenu)
                button.hideModule(name);
        }
    }

    private _showModule(name: string) {
        for (let i = 0; i < this.buttons.length; i++) {
            let button = this.buttons[i];
            if (button instanceof RibbonMenu)
                button.showModule(name);
        }
    }

    protected override async getRibbonItems() {
        this.buttons = [ ];
        if ( ! this.modules)
            return this.buttons;

        let modules = this.modules.get('modules');

        let menus = { };
        let lastSub = null;

        for (let module of modules) {
            let _translate = await module.getTranslator;
            let isNew = module.new;
            for (let analysis of module.analyses) {
                if (analysis.category !== 'plots')
                    continue;

                let groupName = analysis.menuGroup;
                if ((groupName === '.' || groupName === 'More') && analysis.ns !== 'scatr')
                    groupName = 'Other plots';
                let subgroup = analysis.menuSubgroup;
                let menu = groupName in menus ? menus[groupName] : { _title: _translate(groupName) };
                if (analysis.ns === 'jmv' || menu.ns !== 'jmv')
                    menu.ns = analysis.ns;

                menu._new = isNew;
                let submenu = { name };
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
            if (groupName === '.') {
                let buttons = [];
                for (let subgroup in menu) {
                    
                    if (subgroup === '_new' || subgroup === '_title' || subgroup === 'ns')
                        continue;
                    
                    for (let item of menu[subgroup].items) {
                        let name = `${item.ns}-${item.name}`;
                        let analysisButton = new RibbonButton({ class: 'jmv-analyses-button', title: _(item.title), name: name, size: 'large', /*keyTipKey: 'v', keyTipPosition: { x: '50%', y: '90%' }*/ });
                        analysisButton.addEventListener('menuActioned', (event) => {
                            let analysis = { name:item.name, ns:item.ns, title:item.title };
                            this._analysisSelected(analysis);
                        });
                        buttons.push(analysisButton);
                    }
                }
                buttons.push(new RibbonSeparator());
                // between the two separators, where the 'More' menu goes
                this._moreIndex = this.buttons.length + buttons.length;
                buttons.push(new RibbonSeparator());
                this.buttons.push(...buttons);
            }
            else {
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

                let keyTipKey = menu.ns === 'scatr' ?  'M' : null;
                let buttonId2 = interactionManager.nextAriaId('button');
                let buttonElement = document.createElement('button');
                buttonElement.setAttribute('id', buttonId2);
                let button = new RibbonMenu(menu._title, groupName, keyTipKey, flattened, false, containsNew);
                if (menu.ns === 'scatr')
                    this.buttons.splice(this._moreIndex, 0, button);
                else
                    this.buttons.push(button);
            }
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

    private _analysisSelected(analysis: { name: string, ns: string, title: string }) {
        this.emit('analysisSelected', analysis);
    }
}

export default PlotsTab;
