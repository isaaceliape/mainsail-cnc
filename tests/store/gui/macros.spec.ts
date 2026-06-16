import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mutations } from '@/store/gui/macros/mutations'
import { actions } from '@/store/gui/macros/actions'
import { getters } from '@/store/gui/macros/getters'
import { getDefaultState } from '@/store/gui/macros/index'
import type { GuiMacrosState } from '@/store/gui/macros/types'

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

vi.mock('uuid', () => ({
    v4: () => 'mocked-uuid',
}))

vi.mock('@/plugins/helpers', () => ({
    caseInsensitiveSort: (arr: any[], key: string) =>
        arr.sort((a: any, b: any) => (a[key] ?? '').localeCompare(b[key] ?? '')),
}))

describe('gui macros store', () => {
    let state: GuiMacrosState

    beforeEach(() => {
        vi.clearAllMocks()
        state = getDefaultState()
    })

    describe('mutations', () => {
        it('reset restores defaults', () => {
            state.mode = 'expert'
            mutations.reset(state)
            expect(state.mode).toBe('simple')
            expect(state.macrogroups).toEqual({})
        })

        it('groupStore stores a macrogroup', () => {
            mutations.groupStore(state, { id: 'g1', values: { name: 'Group1' } })
            expect(state.macrogroups['g1']).toEqual({ name: 'Group1' })
        })

        it('groupUpdate updates an existing macrogroup', () => {
            state.macrogroups['g1'] = { name: 'Old', color: 'primary', showInStandby: true, showInPrinting: true, showInPause: true }
            mutations.groupUpdate(state, { id: 'g1', values: { name: 'New' } })
            expect(state.macrogroups['g1'].name).toBe('New')
        })

        it('groupUpdate does nothing for unknown id', () => {
            mutations.groupUpdate(state, { id: 'unknown', values: { name: 'New' } })
            expect(state.macrogroups).toEqual({})
        })

        it('addMacroToMacrogroup adds a macro to the group', () => {
            state.macrogroups['g1'] = { name: 'Group1', color: 'primary', showInStandby: true, showInPrinting: true, showInPause: true, macros: [] }
            mutations.addMacroToMacrogroup(state, { id: 'g1', macro: 'G28' })
            expect(state.macrogroups['g1'].macros).toHaveLength(1)
            expect(state.macrogroups['g1'].macros![0].name).toBe('G28')
            expect(state.macrogroups['g1'].macros![0].pos).toBe(1)
        })

        it('removeMacroFromMacrogroup removes a macro', () => {
            state.macrogroups['g1'] = {
                name: 'Group1', color: 'primary', showInStandby: true, showInPrinting: true, showInPause: true,
                macros: [{ pos: 1, name: 'G28', color: 'group', showInStandby: true, showInPrinting: true, showInPause: true }],
            }
            mutations.removeMacroFromMacrogroup(state, { id: 'g1', macro: 'G28' })
            expect(state.macrogroups['g1'].macros).toHaveLength(0)
        })

        it('groupDelete removes a macrogroup', () => {
            state.macrogroups['g1'] = { name: 'Group1', color: 'primary', showInStandby: true, showInPrinting: true, showInPause: true }
            mutations.groupDelete(state, 'g1')
            expect(state.macrogroups).toEqual({})
        })
    })

    describe('actions', () => {
        it('reset delegates to commit', () => {
            const commit = vi.fn()
            actions.reset({ commit } as any)
            expect(commit).toHaveBeenCalledWith('reset')
        })

        it('saveSetting dispatches to gui/saveSetting', () => {
            const dispatch = vi.fn()
            actions.saveSetting({ dispatch } as any, { name: 'mode', value: 'expert' })
            expect(dispatch).toHaveBeenCalledWith('gui/saveSetting', { name: 'macros.mode', value: 'expert' }, { root: true })
        })

        it('groupUpload emits database post_item', () => {
            const stateMock = { macrogroups: { g1: { name: 'Group1', color: 'primary', showInStandby: true, showInPrinting: true, showInPause: true } } }
            actions.groupUpload({ state: stateMock as any } as any, 'g1')
            expect(mockSocket.emit).toHaveBeenCalledWith('server.database.post_item', {
                namespace: 'mainsail',
                key: 'macros.macrogroups.g1',
                value: stateMock.macrogroups['g1'],
            })
        })

        it('groupStore creates group with uuid', async () => {
            const commit = vi.fn()
            const dispatch = vi.fn()
            await actions.groupStore({ commit, dispatch } as any, { values: { name: 'New Group' } })
            expect(commit).toHaveBeenCalledWith('groupStore', { id: 'mocked-uuid', values: { name: 'New Group' } })
            expect(dispatch).toHaveBeenCalledWith('groupUpload', 'mocked-uuid')
        })
    })

    describe('getters', () => {
        it('getAllMacrogroups returns sorted macrogroups', () => {
            state.macrogroups = {
                g2: { name: 'Z group', color: 'primary', showInStandby: true, showInPrinting: true, showInPause: true },
                g1: { name: 'A group', color: 'primary', showInStandby: true, showInPrinting: true, showInPause: true },
            }
            const result = (getters as any).getAllMacrogroups(state)
            expect(result).toHaveLength(2)
            expect(result[0].name).toBe('A group')
            expect(result[1].name).toBe('Z group')
        })

        it('getMacrogroup returns a specific group', () => {
            state.macrogroups['g1'] = { name: 'Group1', color: 'primary', showInStandby: true, showInPrinting: true, showInPause: true }
            expect((getters as any).getMacrogroup(state)('g1').name).toBe('Group1')
        })
    })
})
