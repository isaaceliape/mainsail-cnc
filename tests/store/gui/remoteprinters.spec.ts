import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mutations } from '@/store/gui/remoteprinters/mutations'
import { actions } from '@/store/gui/remoteprinters/actions'
import { getDefaultState } from '@/store/gui/remoteprinters/index'
import type { GuiRemoteprintersState } from '@/store/gui/remoteprinters/types'

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

describe('gui remoteprinters store', () => {
    let state: GuiRemoteprintersState

    beforeEach(() => {
        vi.clearAllMocks()
        state = getDefaultState()
    })

    describe('mutations', () => {
        it('reset restores defaults', () => {
            state.printers['p1'] = { hostname: 'printer1', port: 7125 }
            mutations.reset(state)
            expect(state.printers).toEqual({})
        })

        it('store stores a printer', () => {
            mutations.store(state, { id: 'p1', values: { hostname: 'printer1', port: 7125 } })
            expect(state.printers['p1']).toEqual({ hostname: 'printer1', port: 7125 })
        })

        it('update updates an existing printer', () => {
            state.printers['p1'] = { hostname: 'old', port: 7125 }
            mutations.update(state, { id: 'p1', values: { hostname: 'new' } })
            expect(state.printers['p1'].hostname).toBe('new')
        })

        it('update does nothing for unknown id', () => {
            mutations.update(state, { id: 'unknown', values: { hostname: 'new' } })
            expect(state.printers).toEqual({})
        })

        it('delete removes a printer', () => {
            state.printers['p1'] = { hostname: 'printer1', port: 7125 }
            mutations.delete(state, 'p1')
            expect(state.printers).toEqual({})
        })

        it('delete does nothing for unknown id', () => {
            state.printers['p1'] = { hostname: 'printer1', port: 7125 }
            mutations.delete(state, 'unknown')
            expect(state.printers).toHaveProperty('p1')
        })
    })

    describe('actions', () => {
        it('reset unregisters all printers and commits', () => {
            const commit = vi.fn()
            const dispatch = vi.fn()
            const stateMock = { printers: { p1: { hostname: 'p1', port: 7125 } } }
            actions.reset({ commit, dispatch, state: stateMock as any } as any)
            expect(dispatch).toHaveBeenCalledWith('farm/unregisterPrinter', 'p1', { root: true })
            expect(commit).toHaveBeenCalledWith('reset')
        })

        it('store creates printer and registers on farm', () => {
            const commit = vi.fn()
            const dispatch = vi.fn()
            actions.store({ commit, dispatch } as any, { values: { hostname: 'printer1', port: 7125, name: 'P1' } })
            expect(commit).toHaveBeenCalledWith('store', { id: 'mocked-uuid', values: { hostname: 'printer1', port: 7125, name: 'P1' } })
            expect(dispatch).toHaveBeenCalledWith('farm/registerPrinter', {
                id: 'mocked-uuid',
                hostname: 'printer1',
                port: 7125,
                path: '',
                name: 'P1',
            }, { root: true })
            expect(dispatch).toHaveBeenCalledWith('upload', 'mocked-uuid')
        })

        it('update commits and dispatches farm update', () => {
            const commit = vi.fn()
            const dispatch = vi.fn()
            actions.update({ commit, dispatch } as any, { id: 'p1', values: { hostname: 'new' } })
            expect(commit).toHaveBeenCalledWith('update', { id: 'p1', values: { hostname: 'new' } })
            expect(dispatch).toHaveBeenCalledWith('farm/updatePrinter', { id: 'p1', values: { hostname: 'new' } }, { root: true })
            expect(dispatch).toHaveBeenCalledWith('upload', 'p1')
        })

        it('delete removes printer and unregisters from farm', () => {
            const commit = vi.fn()
            const dispatch = vi.fn()
            const rootState = { instancesDB: 'moonraker' }
            actions.delete({ commit, dispatch, rootState: rootState as any } as any, 'p1')
            expect(commit).toHaveBeenCalledWith('delete', 'p1')
            expect(dispatch).toHaveBeenCalledWith('farm/unregisterPrinter', 'p1', { root: true })
            expect(mockSocket.emit).toHaveBeenCalledWith('server.database.delete_item', {
                namespace: 'mainsail',
                key: 'remoteprinters.printers.p1',
            })
        })

        it('delete uses localStorage for browser instancesDB', () => {
            const commit = vi.fn()
            const dispatch = vi.fn()
            const rootState = { instancesDB: 'browser' }
            actions.delete({ commit, dispatch, rootState: rootState as any } as any, 'p1')
            expect(dispatch).toHaveBeenCalledWith('upload')
        })
    })
})
