import { describe, it, expect, vi } from 'vitest'
import { mutations } from '@/store/gcodeviewer/mutations'
import { actions } from '@/store/gcodeviewer/actions'
import { getDefaultState } from '@/store/gcodeviewer/index'
import type { GcodeviewerState } from '@/store/gcodeviewer/types'

vi.mock('vue', () => ({
    markRaw: (v: unknown) => v,
}))

describe('gcodeviewer store', () => {
    it('getDefaultState returns initial state', () => {
        const state = getDefaultState()
        expect(state.viewerBackup).toBeNull()
        expect(state.canvasBackup).toBeNull()
        expect(state.loadedFileBackup).toBeNull()
    })

    it('reset restores defaults', () => {
        const state: GcodeviewerState = {
            viewerBackup: {} as any,
            canvasBackup: document.createElement('canvas'),
            loadedFileBackup: 'test.gcode',
        }
        mutations.reset(state)
        expect(state.viewerBackup).toBeNull()
        expect(state.canvasBackup).toBeNull()
        expect(state.loadedFileBackup).toBeNull()
    })

    it('setViewerBackup stores backup using markRaw', () => {
        const state: GcodeviewerState = getDefaultState()
        const backup = { some: 'object' }
        mutations.setViewerBackup(state, backup)
        expect(state.viewerBackup).toEqual(backup)
    })

    it('setCanvasBackup stores canvas element', () => {
        const state: GcodeviewerState = getDefaultState()
        const canvas = document.createElement('canvas')
        mutations.setCanvasBackup(state, canvas)
        expect(state.canvasBackup).toBe(canvas)
    })

    it('setLoadedFileBackup stores filename', () => {
        const state: GcodeviewerState = getDefaultState()
        mutations.setLoadedFileBackup(state, 'test.gcode')
        expect(state.loadedFileBackup).toBe('test.gcode')
    })

    describe('actions', () => {
        it('reset delegates to commit', () => {
            const commit = vi.fn()
            actions.reset({ commit } as any)
            expect(commit).toHaveBeenCalledWith('reset')
        })

        it('setViewerBackup delegates to commit', () => {
            const commit = vi.fn()
            const backup = { some: 'data' }
            actions.setViewerBackup({ commit } as any, backup)
            expect(commit).toHaveBeenCalledWith('setViewerBackup', backup)
        })

        it('setCanvasBackup delegates to commit', () => {
            const commit = vi.fn()
            const canvas = document.createElement('canvas')
            actions.setCanvasBackup({ commit } as any, canvas)
            expect(commit).toHaveBeenCalledWith('setCanvasBackup', canvas)
        })

        it('setLoadedFileBackup delegates to commit', () => {
            const commit = vi.fn()
            actions.setLoadedFileBackup({ commit } as any, 'test.gcode')
            expect(commit).toHaveBeenCalledWith('setLoadedFileBackup', 'test.gcode')
        })
    })
})
