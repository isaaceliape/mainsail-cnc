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

import SettingsDashboardTabMobile from '@/components/settings/Dashboard/Mobile.vue'

describe('SettingsDashboardTabMobile.vue', () => {
    it('renders without crashing', () => {
        const wrapper = mount(SettingsDashboardTabMobile, { global: { plugins: [store, i18n] } })
        expect(wrapper.exists()).toBe(true)
    })

    it('renders one sortable column for mobile', () => {
        const wrapper = mount(SettingsDashboardTabMobile, { global: { plugins: [store, i18n] } })
        const sortables = wrapper.findAll('.dashboard-sortable')
        expect(sortables.length).toBe(1)
        expect(sortables[0].text()).toContain('mobile')
    })
})
