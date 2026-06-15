import { describe, expect, it, vi } from 'vitest'

vi.mock('@codemirror/view', () => ({
    EditorView: {
        scrollIntoView: vi.fn((pos: number, opts: { y: string }) => ({
            type: 'scrollIntoView' as const,
            pos,
            opts,
        })),
    },
}))

import { EditorView } from '@codemirror/view'

function gotoLine(cminstance: any, line: number) {
    const l = cminstance?.state?.doc.line(line)
    if (!l) return
    cminstance?.dispatch({
        selection: { head: l.from, anchor: l.to },
        effects: EditorView.scrollIntoView(l.from, { y: 'center' }),
    })
}

function makeMockEditor(docLines: Record<number, { from: number; to: number; text: string }>) {
    const mockDispatch = vi.fn()
    const cminstance = {
        state: {
            doc: {
                line: vi.fn((n: number) => docLines[n] ?? null),
            },
        },
        dispatch: mockDispatch,
    }
    return { cminstance, mockDispatch }
}

describe('gotoLine', () => {
    it('dispatches selection and centered scrollIntoView for a valid line', () => {
        const { cminstance, mockDispatch } = makeMockEditor({
            5: { from: 100, to: 120, text: 'hello' },
        })

        gotoLine(cminstance, 5)

        expect(mockDispatch).toHaveBeenCalledWith({
            selection: { head: 100, anchor: 120 },
            effects: { type: 'scrollIntoView', pos: 100, opts: { y: 'center' } },
        })
    })

    it('selects the full line range (from → to)', () => {
        const { cminstance, mockDispatch } = makeMockEditor({
            3: { from: 10, to: 50, text: 'range test' },
        })

        gotoLine(cminstance, 3)

        expect(mockDispatch).toHaveBeenCalledWith(
            expect.objectContaining({
                selection: { head: 10, anchor: 50 },
            })
        )
    })

    it('does nothing when the line number is beyond the document', () => {
        const { cminstance, mockDispatch } = makeMockEditor({
            1: { from: 0, to: 5, text: 'only line 1 exists' },
        })

        gotoLine(cminstance, 999)

        expect(mockDispatch).not.toHaveBeenCalled()
    })

    it('does nothing when the line does not exist (returns null)', () => {
        const { cminstance, mockDispatch } = makeMockEditor({})

        gotoLine(cminstance, 42)

        expect(mockDispatch).not.toHaveBeenCalled()
    })

    it('does not crash when cminstance is null', () => {
        expect(() => gotoLine(null, 5)).not.toThrow()
    })

    it('does not crash when cminstance.state is null', () => {
        expect(() => gotoLine({ state: null }, 5)).not.toThrow()
    })
})
