
export class Lobby {
    async show(location, query): Promise<{ action: 'open', data: { [ name: string ]: any} }> {
        throw new Error('Not implemented');
    }

    // the browser's back button was pressed. it doesn't leave the page, so a
    // stray click can't lose unsaved work; a deployment with a home screen
    // may show it, over what's open
    back(instance): void {
    }
}

export const hasLobby = false;

const _lobby = new Lobby();

export default _lobby;