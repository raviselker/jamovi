import type { HeaderRows } from '../../ribbonheader';

export class Lobby {
    async show(location, query): Promise<{ action: 'open', data: { [ name: string ]: any} }> {
        throw new Error('Not implemented');
    }

    // the browser's back button (or forward) was pressed. true if the lobby
    // has handled it, the url included (a deployment with a home screen may
    // show it, over what's open). false, and jamovi keeps the page where it
    // is, so a stray click can't lose unsaved work
    back(instance): boolean {
        return false;
    }

    // the ribbon's header in two rows, filled by the deployment, or null to
    // leave it as it is
    ribbonHeader(instance): HeaderRows | null {
        return null;
    }
}

export const hasLobby = false;

const _lobby = new Lobby();

export default _lobby;