import { ref } from 'vue'
import { useStore } from 'vuex'
import { getCncWcs, selectCncWcs } from '@/store/files/cncApi'

export const offsetNames = ['G54', 'G55', 'G56', 'G57', 'G58', 'G59']

const activeWcs = ref('G54')
const wcsOffsets = ref<Record<string, { X: number; Y: number; Z: number }>>({})

export function useCncOffsets() {
    const store = useStore()

    async function refreshWcs() {
        const raw = await getCncWcs(store.getters['socket/getUrl'])
        const data = raw?.result ?? raw
        activeWcs.value = typeof data?.active === 'string' ? data.active : 'G54'

        if (data?.offsets && typeof data.offsets === 'object') {
            const mapped: Record<string, { X: number; Y: number; Z: number }> = {}
            for (const [key, val] of Object.entries(data.offsets)) {
                const v = val as Record<string, number>
                mapped[key] = { X: v.X ?? 0, Y: v.Y ?? 0, Z: v.Z ?? 0 }
            }
            wcsOffsets.value = mapped
        }
    }

    async function setActiveWcs(wcs: string) {
        if (wcs === activeWcs.value) return
        await selectCncWcs(store.getters['socket/getUrl'], { wcs })
        activeWcs.value = wcs
    }

    return {
        offsetNames,
        activeWcs,
        wcsOffsets,
        refreshWcs,
        setActiveWcs,
    }
}
