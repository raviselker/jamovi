import { describe, expect, it } from 'vitest';

import { Lobby } from '../extras/lobby';

// jamovi's own lobby, as the desktop has it. a deployment replaces
// extras/lobby with its own, so this runs against jamovi's client alone
describe('the default lobby', () => {
    it('changes nothing: no header rows, and Back is left to jamovi', () => {
        const lobby = new Lobby();
        expect(lobby.ribbonHeader({})).toBeNull();
        expect(lobby.back({})).toBe(false);
    });
});
