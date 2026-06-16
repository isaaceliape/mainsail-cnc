import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mutations } from '@/store/printer/tempHistory/mutations'
import { getDefaultState } from '@/store/printer/tempHistory/index'
import type { PrinterTempHistoryState } from '@/store/printer/tempHistory/types'

vi.mock('@/store/variables', () => ({
    colorArray: ['#F44336', '#8e379d', '#03DAC5', '#3F51B5', '#ffde03', '#009688', '#E91E63'],
    colorHeaterBed: '#2196F3',
    colorChamber: '#4CAF50',
    datasetInterval: 1000,
    datasetTypes: ['temperature', 'target', 'power', 'speed'],
    datasetTypesInPercents: ['power', 'speed'],
}))

describe('printer tempHistory store', () => {
    let state: PrinterTempHistoryState

    beforeEach(() => {
        vi.clearAllMocks()
        state = getDefaultState()
    })

    describe('mutations', () => {
        it('reset restores defaults', () => {
            state.source = [{ date: new Date() }]
            state.series = [{ id: 1, name: 'extruder-temperature' } as any]
            mutations.reset(state)
            expect(state.source).toEqual([])
            expect(state.series).toEqual([])
            expect(state.timeLastUpdate).toBeNull()
            expect(state.updateSourceInterval).toBeNull()
        })

        it('setInitSource sets the source array', () => {
            const source = [{ date: new Date(), 'extruder-temperature': 200 }]
            mutations.setInitSource(state, source)
            expect(state.source).toEqual(source)
        })

        it('setInitSeries sets the series array', () => {
            const series = [{ id: 1, name: 'extruder-temperature' } as any]
            mutations.setInitSeries(state, series)
            expect(state.series).toEqual(series)
        })

        it('addToSource appends data and enforces maxHistory', () => {
            const source = [
                { date: new Date(1000) },
                { date: new Date(2000) },
            ]
            state.source = source
            mutations.addToSource(state, {
                data: { date: new Date(3000) },
                maxHistory: 2,
            })
            expect(state.source).toHaveLength(2)
            expect(state.source[0].date).toEqual(new Date(2000))
            expect(state.source[1].date).toEqual(new Date(3000))
        })

        it('saveLastDate saves the timestamp', () => {
            mutations.saveLastDate(state, 12345)
            expect(state.timeLastUpdate).toBe(12345)
        })

        it('setUpdateSourceInterval saves the interval id', () => {
            const interval = setInterval(() => { }, 1000)
            mutations.setUpdateSourceInterval(state, interval)
            expect(state.updateSourceInterval).toBe(interval)
            clearInterval(interval)
        })
    })
})
