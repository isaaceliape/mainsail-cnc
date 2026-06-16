import { describe, it, expect, beforeEach, vi } from 'vitest'
import { actions } from '@/store/printer/actions'
import { mutations } from '@/store/printer/mutations'
import { getDefaultState } from '@/store/printer/index'
import type { PrinterState } from '@/store/printer/types'

const mockSocket = vi.hoisted(() => ({
    emit: vi.fn(),
    emitAndWait: vi.fn(),
}))
const mockToast = vi.hoisted(() => ({
    error: vi.fn(),
    success: vi.fn(),
}))

vi.mock('@/store/runtime', () => ({
    getSocket: () => mockSocket,
    $toast: mockToast,
}))

describe('printer actions', () => {
    let state: PrinterState

    beforeEach(() => {
        vi.clearAllMocks()
        state = getDefaultState()
    })

    it('reset commits reset and clears tempHistory and socket loadings', () => {
        const commit = vi.fn()
        actions.reset({ commit } as any)
        expect(commit).toHaveBeenCalledWith('reset')
        expect(commit).toHaveBeenCalledWith('tempHistory/reset')
        expect(commit).toHaveBeenCalledWith('socket/clearLoadings', null, { root: true })
    })

    it('init dispatches reset, adds init modules, and emits requests', () => {
        const dispatch = vi.fn()
        actions.init({ dispatch } as any)
        expect(dispatch).toHaveBeenCalledWith('reset')
        expect(dispatch).toHaveBeenCalledWith('socket/addInitModule', 'printer/info', { root: true })
        expect(dispatch).toHaveBeenCalledWith('socket/addInitModule', 'printer/initSubscripts', { root: true })
        expect(dispatch).toHaveBeenCalledWith('socket/addInitModule', 'printer/initTempHistory', { root: true })
        expect(dispatch).toHaveBeenCalledWith('socket/addInitModule', 'server/gcode_store', { root: true })
        expect(dispatch).toHaveBeenCalledWith('initSubscripts')
        expect(mockSocket.emit).toHaveBeenCalledWith('printer.info', {}, { action: 'printer/getInfo' })
        expect(mockSocket.emit).toHaveBeenCalledWith('server.gcode_store', {}, { action: 'server/getGcodeStore' })
    })

    it('getInfo commits printer info and removes init module', () => {
        const commit = vi.fn()
        const dispatch = vi.fn()
        const payload = {
            state: 'ready',
            state_message: 'Printer is ready',
            app: 'Klipper',
            hostname: 'myprinter',
            software_version: 'v0.12.0',
            cpu_info: { cpu_count: 4 },
        }
        actions.getInfo({ commit, dispatch } as any, payload)
        expect(commit).toHaveBeenCalledWith('server/setData', { klippy_state: 'ready', klippy_message: 'Printer is ready' }, { root: true })
        expect(commit).toHaveBeenCalledWith('setData', {
            app_name: 'Klipper',
            hostname: 'myprinter',
            software_version: 'v0.12.0',
            cpu_info: { cpu_count: 4 },
        })
        expect(dispatch).toHaveBeenCalledWith('socket/removeInitModule', 'printer/info', { root: true })
    })

    it('sendGcode dispatches addEvent and emits gcode script', () => {
        const dispatch = vi.fn()
        actions.sendGcode({ dispatch } as any, 'G28')
        expect(dispatch).toHaveBeenCalledWith('server/addEvent', { message: 'G28', type: 'command' }, { root: true })
        expect(mockSocket.emit).toHaveBeenCalledWith('printer.gcode.script', { script: 'G28' }, { loading: 'sendGcode' })
    })

    it('sendGcode emits emergency_stop for M112', () => {
        const dispatch = vi.fn()
        actions.sendGcode({ dispatch } as any, 'M112')
        expect(mockSocket.emit).toHaveBeenCalledWith('printer.emergency_stop', {}, { loading: 'sendGcode' })
    })

    it('getData processes status payload with webhooks', () => {
        const commit = vi.fn()
        const dispatch = vi.fn()
        const thisDispatch = vi.fn()
        const payload = {
            status: {
                webhooks: { state: 'ready', state_message: 'ok' },
                toolhead: { axis_maximum: [300, 300, 200], axis_minimum: [0, 0, -5] },
                configfile: { settings: { printer: { kinematics: 'corexy' } } },
                extruder: { temperature: 200 },
            },
        }
        actions.getData.call(
            { dispatch: thisDispatch },
            { commit, dispatch, state } as any,
            payload
        )
        expect(thisDispatch).toHaveBeenCalledWith('server/getData', { klippy_state: 'ready', klippy_message: 'ok' }, { root: true })
        expect(dispatch).toHaveBeenCalledWith('gui/updateGcodeviewerCache', { kinematics: 'corexy' }, { root: true })
        expect(dispatch).toHaveBeenCalledWith('gui/updateGcodeviewerCache', { axis_maximum: [300, 300, 200] }, { root: true })
        expect(dispatch).toHaveBeenCalledWith('gui/updateGcodeviewerCache', { axis_minimum: [0, 0, -5] }, { root: true })
        expect(commit).toHaveBeenCalledWith('setData', expect.objectContaining({ extruder: { temperature: 200 } }))
    })

    it('getEndstopStatus commits payload', () => {
        const commit = vi.fn()
        const payload = { endstops: { x: 'TRIGGERED' } }
        actions.getEndstopStatus({ commit } as any, payload)
        expect(commit).toHaveBeenCalledWith('setEndstopStatus', payload)
    })

    it('removeBedMeshProfile commits payload', () => {
        const commit = vi.fn()
        actions.removeBedMeshProfile({ commit } as any, 'default')
        expect(commit).toHaveBeenCalledWith('removeBedMeshProfile', 'default')
    })
})
