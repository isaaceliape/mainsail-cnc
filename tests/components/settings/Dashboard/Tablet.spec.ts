import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createStore } from 'vuex'
import { createI18n } from 'vue-i18n'

vi.mock('vuetify/components', () => ({
    VCard: { name: 'VCard', inheritAttrs: false, template: '<div><slot /></div>' },
    VCardText: { name: 'VCardText', template: '<div><slot /></div>' },
    VRow: { name: 'VRow', template: '<div><slot /></div>' },
    VCol: { name: 'VCol', template: '<div><slot /></div>' },
}))

vi.mock('@/components/settings/Dashboard/Sortable.vue', () => ({
    default: {
        name: 'SettingsDashboardSortable',
        props: ['viewportName', 'column'],
        template: '<div class="dashboard-sortable">{{ viewportName }} col={{ column }}</div>',
    },
}))

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en: {} } })
const store = createStore({ state: { gui: { dashboard: {} }, instancesDB: 'moonraker' } })

import SettingsDashboardTabTablet from '@/components/settings/Dashboard/Tablet.vue'

describe('SettingsDashboardTabTablet.vue', () => {
    it('renders without crashing', () => {
        const wrapper = mount(SettingsDashboardTabTablet, { global: { plugins: [store, i18n] } })
        expect(wrapper.exists()).toBe(true)
    })

    it('renders two sortable columns', () => {
        const wrapper = mount(SettingsDashboardTabTablet, { global: { plugins: [store, i18n] } })
        expect(wrapper.findAll('.dashboard-sortable').length).toBe(2)
    })
})
