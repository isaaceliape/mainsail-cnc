import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mutations } from '@/store/gui/maintenance/mutations'
import { actions } from '@/store/gui/maintenance/actions'
import { getDefaultState } from '@/store/gui/maintenance/index'
import type { GuiMaintenanceState } from '@/store/gui/maintenance/types'

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

vi.mock('@/store/variables', () => ({
    themeDir: '.theme',
}))

describe('gui maintenance store', () => {
    let state: GuiMaintenanceState

    beforeEach(() => {
        vi.clearAllMocks()
        state = getDefaultState()
    })

    describe('mutations', () => {
        it('reset restores defaults', () => {
            state.entries['e1'] = {
                name: 'Test', note: '', perform_note: null,
                start_time: 1000, end_time: null,
                start_filament: 0, end_filament: null,
                start_printtime: 0, end_printtime: null,
                last_entry: null,
                reminder: { type: null, filament: { bool: false, value: null }, printtime: { bool: false, value: null }, date: { bool: false, value: null } },
            }
            mutations.reset(state)
            expect(state.entries).toEqual({})
        })

        it('initStore replaces entries', () => {
            const entries = { e1: { name: 'Lube', note: '', perform_note: null, start_time: 1000, end_time: null, start_filament: 0, end_filament: null, start_printtime: 0, end_printtime: null, last_entry: null, reminder: { type: null, filament: { bool: false, value: null }, printtime: { bool: false, value: null }, date: { bool: false, value: null } } } }
            mutations.initStore(state, entries)
            expect(state.entries).toEqual(entries)
        })

        it('store adds an entry', () => {
            mutations.store(state, {
                id: 'e1',
                values: {
                    name: 'Lube', note: '', perform_note: null,
                    start_time: 1000, end_time: null,
                    start_filament: 0, end_filament: null,
                    start_printtime: 0, end_printtime: null,
                    last_entry: null,
                    reminder: { type: null, filament: { bool: false, value: null }, printtime: { bool: false, value: null }, date: { bool: false, value: null } },
                },
            })
            expect(state.entries['e1'].name).toBe('Lube')
        })

        it('update modifies existing entry', () => {
            const entry = { name: 'Old', note: '', perform_note: null, start_time: 1000, end_time: null, start_filament: 0, end_filament: null, start_printtime: 0, end_printtime: null, last_entry: null, reminder: { type: null, filament: { bool: false, value: null }, printtime: { bool: false, value: null }, date: { bool: false, value: null } } }
            state.entries['e1'] = entry
            mutations.update(state, { id: 'e1', entry: { name: 'New' } })
            expect(state.entries['e1'].name).toBe('New')
        })

        it('update does nothing for unknown id', () => {
            mutations.update(state, { id: 'unknown', entry: { name: 'New' } })
            expect(state.entries).toEqual({})
        })

        it('delete removes an entry', () => {
            state.entries['e1'] = { name: 'Test', note: '', perform_note: null, start_time: 1000, end_time: null, start_filament: 0, end_filament: null, start_printtime: 0, end_printtime: null, last_entry: null, reminder: { type: null, filament: { bool: false, value: null }, printtime: { bool: false, value: null }, date: { bool: false, value: null } } }
            mutations.delete(state, 'e1')
            expect(state.entries).toEqual({})
        })
    })

    describe('actions', () => {
        it('reset delegates to commit', () => {
            const commit = vi.fn()
            actions.reset({ commit } as any)
            expect(commit).toHaveBeenCalledWith('reset')
        })

        it('init emits database get_item', () => {
            actions.init()
            expect(mockSocket.emit).toHaveBeenCalledWith('server.database.get_item', { namespace: 'maintenance' }, { action: 'gui/maintenance/initStore' })
        })

        it('initStore resets and loads entries', async () => {
            const commit = vi.fn()
            const dispatch = vi.fn()
            const payload = { value: { e1: { name: 'Test' } } }
            await actions.initStore({ commit, dispatch } as any, payload)
            expect(commit).toHaveBeenCalledWith('reset')
            expect(commit).toHaveBeenCalledWith('initStore', { e1: { name: 'Test' } })
            expect(dispatch).toHaveBeenCalledWith('socket/removeInitModule', 'gui/maintenance/init', { root: true })
        })

        it('upload emits database post_item', () => {
            actions.upload({} as any, { id: 'e1', value: { name: 'Test' } })
            expect(mockSocket.emit).toHaveBeenCalledWith('server.database.post_item', {
                namespace: 'maintenance',
                key: 'e1',
                value: { name: 'Test' },
            })
        })

        it('store creates entry with uuid', async () => {
            const commit = vi.fn()
            const dispatch = vi.fn()
            const stateMock = { entries: { 'mocked-uuid': { name: 'Test', note: '', perform_note: null, start_time: 1000, end_time: null, start_filament: 0, end_filament: null, start_printtime: 0, end_printtime: null, last_entry: null, reminder: { type: null, filament: { bool: false, value: null }, printtime: { bool: false, value: null }, date: { bool: false, value: null } } } } }
            await actions.store({ commit, dispatch, state: stateMock as any } as any, {
                entry: { name: 'Test', note: '' },
            })
            expect(commit).toHaveBeenCalledWith('store', { id: 'mocked-uuid', values: { name: 'Test', note: '' } })
            expect(dispatch).toHaveBeenCalledWith('upload', { id: 'mocked-uuid', value: stateMock.entries['mocked-uuid'] })
        })

        it('delete commits and emits delete_item', () => {
            const commit = vi.fn()
            actions.delete({ commit } as any, 'e1')
            expect(commit).toHaveBeenCalledWith('delete', 'e1')
            expect(mockSocket.emit).toHaveBeenCalledWith('server.database.delete_item', { namespace: 'maintenance', key: 'e1' })
        })
    })
})
