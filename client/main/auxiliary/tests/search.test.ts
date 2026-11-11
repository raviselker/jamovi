// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { highlightSearch, matchesSearch } from '../search';

function marked(text: string, search: string): string {
    const div = document.createElement('div');
    div.append(highlightSearch(text, search));
    return div.innerHTML.replace(/<mark class="aux-search-highlight">(.*?)<\/mark>/g, '[$1]');
}

describe('side panel search', () => {
    it('matches without case or accents', () => {
        expect(matchesSearch('Médiation Analysis', 'mediation')).toBe(true);
        expect(matchesSearch('mediation', 'MÉDIATION')).toBe(true);
        expect(matchesSearch('ANOVA', ' anova ')).toBe(true);
        expect(matchesSearch('ANOVA', 'ancova')).toBe(false);
        expect(matchesSearch('anything', '')).toBe(true);
    });

    it('marks every match, in the original text', () => {
        expect(marked('One-Way ANOVA, ANOVA', 'anova')).toBe('One-Way [ANOVA], [ANOVA]');
        expect(marked('Médiation', 'media')).toBe('[Média]tion');
        expect(marked('Plot', '')).toBe('Plot');
        expect(marked('Plot', 'x')).toBe('Plot');
    });
});
