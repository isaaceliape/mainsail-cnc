import { describe, expect, it } from 'vitest'
import { getCursorTooltipPosition, previewCursorStyle } from '@/components/panels/Cnc/wcsPreview'

describe('Wcs preview helpers', () => {
    it('hides the browser cursor while hovering the preview', () => {
        expect(previewCursorStyle).toEqual({ cursor: 'none' })
    })

    it('offsets the tooltip away from the pointer so it does not overlap the guide lines', () => {
        expect(getCursorTooltipPosition(100, 200)).toEqual({
            left: 118,
            top: 166,
        })
    })
})
