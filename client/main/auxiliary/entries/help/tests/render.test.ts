// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { renderDoc } from '../render';

describe('help document rendering', () => {
    it('keeps the document structure', () => {
        const doc = renderDoc([
            '# Independent Samples T-Test',
            '',
            '## Options',
            '',
            '### Tests',
            '',
            '- **Welch\'s** — does not assume equal variances, see `len`.',
            '',
            '| Check | Tests |',
            '|---|---|',
            '| Levene | variances |',
        ].join('\n'));

        expect(doc.querySelector('h1')?.textContent).toBe('Independent Samples T-Test');
        expect(doc.querySelector('h2')?.textContent).toBe('Options');
        expect(doc.querySelector('h3')?.textContent).toBe('Tests');
        expect(doc.querySelector('li strong')?.textContent).toBe('Welch\'s');
        expect(doc.querySelector('li code')?.textContent).toBe('len');
        expect(doc.querySelectorAll('table td')).toHaveLength(2);
        // its direction comes from its own text, not the UI's
        expect(doc.getAttribute('dir')).toBe('auto');
    });

    it('typesets display and inline maths without markdown mangling the TeX', () => {
        const doc = renderDoc([
            '- **Effect size** — Cohen\'s d, where $\\mu_0$ is the test value:',
            '',
            '  $$\\begin{aligned}',
            '  d &= \\frac{M_1 - M_2}{s_p} \\\\[4pt]',
            '  s_p^2 &= \\frac{(n_1 - 1)s_1^2}{n_1 - 2}',
            '  \\end{aligned}$$',
        ].join('\n'));

        const display = doc.querySelectorAll('.aux-help-math-display .katex-display');
        const inline = doc.querySelectorAll('.aux-help-math:not(.aux-help-math-display) .katex');
        expect(display).toHaveLength(1);
        expect(inline).toHaveLength(1);
        // katex reports TeX it can't parse in a .katex-error, rather than throwing
        expect(doc.querySelector('.katex-error')).toBeNull();
        // underscores in the TeX haven't become emphasis
        expect(doc.querySelector('em')).toBeNull();
        expect(doc.textContent).not.toContain('');
    });

    it('strips markup the documents shouldn\'t carry', () => {
        const doc = renderDoc('Text <img src=x onerror="alert(1)"> <script>alert(2)</script> [link](javascript:alert(3))');

        expect(doc.querySelector('img, script')).toBeNull();
        expect(doc.querySelector('a')?.getAttribute('href') ?? '').not.toContain('javascript');
    });

    it('keeps relative links to other documents', () => {
        const doc = renderDoc('See [checking assumptions](topics/assumption-checks.md).');

        expect(doc.querySelector('a')?.getAttribute('href')).toBe('topics/assumption-checks.md');
    });
});
