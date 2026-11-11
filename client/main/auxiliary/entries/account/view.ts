import { h } from '../../../../common/htmlelementcreator';
import * as auth from '../../../auth/auth';
import host from '../../../host';
import { AuxView } from '../../types';

function initials(name: string): string {
    return name.split(/\s+/).filter(part => part !== '').slice(0, 2)
        .map(part => part[0].toLocaleUpperCase()).join('');
}

function avatar(user: auth.IUser, className: string): HTMLElement {
    const element = h('span', { class: `aux-account-avatar ${ className }`, 'aria-hidden': 'true' }, initials(user.name));
    if (user.picture)
        element.replaceChildren(h('img', { src: user.picture, alt: '' }));
    return element;
}

// the signed in user's account; its button's hidden while there's no user
// (always, outside jamovi cloud)
export default class AccountAuxView extends AuxView {
    button: HTMLButtonElement | null = null;
    content = h('div', { class: 'aux-account' });

    constructor() {
        super('account');
    }

    getTitle() {
        return _('Account');
    }

    createToolbarButton(): HTMLButtonElement {
        this.button = super.createToolbarButton();
        this.updateButton();
        // shortcut: assumes auth's events stream reports sign in and out, and
        // refreshes on anything it reports; confirm against jamovi cloud's auth
        void (async () => {
            for await (const _event of auth.events())
                this.updateButton();
            this.updateButton();
        })();
        return this.button;
    }

    updateButton(): void {
        if (this.button === null)
            return;
        const user = auth.currentUser();
        this.button.hidden = user === null;
        const icon = this.button.querySelector('.aux-toolbar-icon');
        if (user !== null)
            icon?.replaceChildren(avatar(user, 'aux-account-avatar-small'));
        if (this.shown)
            this.update();
    }

    getBody() {
        return this.createBodyElement(this.content);
    }

    onShow(): void {
        this.update();
    }

    update(): void {
        const user = auth.currentUser();
        if (user === null) {
            this.content.replaceChildren();
            return;
        }

        const actions = h('div', { class: 'aux-account-actions' });
        if (user.manageUrl) {
            const manage = h('button', { type: 'button' }, _('Manage subscriptions'));
            manage.addEventListener('click', () => host.openUrl(user.manageUrl!));
            actions.append(manage);
        }
        const signOut = h('button', { type: 'button' }, _('Sign out'));
        signOut.addEventListener('click', () => void auth.signOut());
        actions.append(signOut);

        this.content.replaceChildren(
            h('div', { class: 'aux-account-profile' },
                avatar(user, 'aux-account-avatar-large'),
                h('div', { class: 'aux-account-details' },
                    h('div', { class: 'aux-account-name', dir: 'auto' }, user.name),
                    h('div', { class: 'aux-account-email' }, user.email),
                    user.plan ? h('div', { class: 'aux-account-plan', dir: 'auto' }, user.plan) : '')),
            actions);
    }
}
