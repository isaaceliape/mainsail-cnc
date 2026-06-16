import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createStore } from 'vuex'
import { ref, nextTick, h, defineComponent } from 'vue'
import Responsive from '@/components/ui/Responsive.vue'

vi.mock('@/composables/useBase', () => ({
    useBase: () => ({
        viewport: { value: 'desktop' },
    }),
}))

// Mock useResponsive since its behavior is already tested in composable tests
const mockEl = vi.hoisted(() => ({ is: {} }))

vi.mock('@/composables/useResponsive', () => ({
    useResponsive: () => ({
        el: mockEl,
        targetRef: { value: null },
        viewport: { value: 'desktop' },
    }),
}))

describe('Responsive.vue', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockEl.is = {}
    })

    it('renders slot content', () => {
        const wrapper = mount(Responsive, {
            props: { noHide: true },
            slots: {
                default: '<div class="test-content">Hello World</div>',
            },
        })
        expect(wrapper.find('.test-content').exists()).toBe(true)
        expect(wrapper.text()).toContain('Hello World')
    })

    it('renders both hidden and visible div when noHide is false and init is false', () => {
        const wrapper = mount(Responsive, {
            props: { noHide: false },
            slots: {
                default: '<div class="test-content">Hello</div>',
            },
        })

        // Before mount lifecycle runs (init=false), two copies of slot content
        const contents = wrapper.findAll('.test-content')
        expect(contents).toHaveLength(2)
    })

    it('renders only one div when noHide is true', () => {
        const wrapper = mount(Responsive, {
            props: { noHide: true },
            slots: {
                default: '<div class="test-content">Hello</div>',
            },
        })

        const contents = wrapper.findAll('.test-content')
        expect(contents).toHaveLength(1)
    })

    it('renders only one visible div after mount (init becomes true)', async () => {
        const wrapper = mount(Responsive, {
            props: { noHide: false },
            slots: {
                default: '<div class="test-content">Hello</div>',
            },
        })

        // Initially two divs before mounted lifecycle runs
        expect(wrapper.findAll('.test-content')).toHaveLength(2)

        // Wait for onMounted to set init=true
        await nextTick()

        // After mount, init=true so the hidden div (v-if="!noHide && !init") disappears
        const contents = wrapper.findAll('.test-content')
        expect(contents).toHaveLength(1)
    })

    it('exposes el via scoped slot', () => {
        // Use a render function slot to access scoped slot props without TS in template
        const wrapper = mount(Responsive, {
            props: { noHide: true },
            slots: {
                default: (slotProps: any) =>
                    h('div', { class: 'scoped-test', 'data-el': JSON.stringify({ is: slotProps.el.is }) }, 'Scoped'),
            },
        })

        const scopedDiv = wrapper.find('.scoped-test')
        expect(scopedDiv.exists()).toBe(true)
        const elAttr = scopedDiv.attributes('data-el')
        expect(elAttr).toBeTruthy()
        expect(JSON.parse(elAttr!)).toEqual({ is: {} })
    })

    it('passes breakpoints prop to useResponsive', () => {
        const breakpoints = {
            wide: (cr: DOMRect) => cr.width >= 400,
        }

        const wrapper = mount(Responsive, {
            props: {
                noHide: true,
                breakpoints,
            },
            slots: {
                default: '<div class="test-content">With breakpoints</div>',
            },
        })

        expect(wrapper.find('.test-content').exists()).toBe(true)
        expect(wrapper.text()).toContain('With breakpoints')
    })

    it('renders correctly with non-functional slot (static content)', () => {
        const wrapper = mount(Responsive, {
            props: { noHide: true },
            slots: {
                default: '<span class="static-slot">Static</span>',
            },
        })
        expect(wrapper.find('.static-slot').exists()).toBe(true)
        expect(wrapper.text()).toBe('Static')
    })

    it('sets init to true on mount', async () => {
        const wrapper = mount(Responsive, {
            props: { noHide: false },
            slots: {
                default: '<div class="content">X</div>',
            },
        })

        // Before mount lifecycle, init=false so 2 copies
        expect(wrapper.findAll('.content')).toHaveLength(2)

        await nextTick()

        // After mount lifecycle, init=true so only 1 copy
        expect(wrapper.findAll('.content')).toHaveLength(1)
    })
})
