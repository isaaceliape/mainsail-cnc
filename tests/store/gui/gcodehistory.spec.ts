import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mutations } from '@/store/gui/gcodehistory/mutations'
import { actions } from '@/store/gui/gcodehistory/actions'
import { getDefaultState } from '@/store/gui/gcodehistory/index'
import type { GuiGcodehistoryState } from '@/store/gui/gcodehistory/types'

const mockSocket = vi.hoisted(() => ({
    emit: vi.fn(),
}))
const mockToast = vi.hoisted(() => ({
    error: vi.fn(),
    success: vi.fn(),
}))

vi.mock('@/store/runtime', () => ({
    getSocket: () => mockSocket,
    $toast: mockToast,
}))

vi.mock('@/store/variables', () => ({
    maxGcodeHistory: 100,
}))

describe('gui gcodehistory store', () => {
    let state: GuiGcodehistoryState

    beforeEach(() => {
        vi.clearAllMocks()
        state = getDefaultState()
    })

    describe('mutations', () => {
        it('reset restores defaults', () => {
            state.entries = ['G28', 'G91']
            mutations.reset(state)
            expect(state.entries).toEqual([])
        })

        it('updateHistory replaces entries', () => {
            const entries = ['G28', 'G91']
            mutations.updateHistory(state, entries)
            expect(state.entries).toEqual(entries)
        })
    })

    describe('actions', () => {
        it('reset delegates to commit', () => {
            const commit = vi.fn()
            actions.reset({ commit } as any)
            expect(commit).toHaveBeenCalledWith('reset')
        })

        it('upload emits database post_item with current entries', () => {
            const stateMock = { entries: ['G28'] }
            actions.upload({ state: stateMock as any } as any)
            expect(mockSocket.emit).toHaveBeenCalledWith('server.database.post_item', {
                namespace: 'mainsail',
                key: 'gcodehistory.entries',
                value: ['G28'],
            })
        })

        it('addToHistory adds entry and enforces max, then uploads', async () => {
            const commit = vi.fn()
            const dispatch = vi.fn()
            const stateMock = { entries: [] }
            await actions.addToHistory({ commit, dispatch, state: stateMock as any } as any, 'G28')
            expect(commit).toHaveBeenCalledWith('updateHistory', ['G28'])
            expect(dispatch).toHaveBeenCalledWith('upload')
        })
    })
})
