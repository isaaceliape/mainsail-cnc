import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { getters } from '@/store/server/getters'
import { mutations } from '@/store/server/mutations'
import { actions } from '@/store/server/actions'
import { actions as historyActions } from '@/store/server/history/actions'
import { actions as jobQueueActions } from '@/store/server/jobQueue/actions'
import { actions as timelapseActions } from '@/store/server/timelapse/actions'
import { getDefaultState } from '@/store/server/index'
import type { ServerState } from '@/store/server/types'

const mockSocket = vi.hoisted(() => ({
    emit: vi.fn(),
    emitAndWait: vi.fn(),
}))
const mockToast = vi.hoisted(() => ({
    error: vi.fn(),
    success: vi.fn(),
}))
const mockRouter = vi.hoisted(() => ({
    currentRoute: {
        path: '/printer',
    },
}))

vi.mock('@/store/runtime', () => ({
    getSocket: () => mockSocket,
    $toast: mockToast,
}))

vi.mock('@/plugins/router', () => ({
    default: mockRouter,
}))

vi.mock('@/plugins/helpers', () => ({
    camelize: (value: string) => value.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()),
    formatConsoleMessage: (message: string) => `fmt:${message}`,
    formatFilesize: (bytes: number) => `FS:${bytes}`,
}))

vi.mock('@/store/variables', () => ({
    initableServerComponents: ['power', 'sensor'],
    maxEventHistory: 2,
}))

describe('server store', () => {
    let state: ServerState

    beforeEach(() => {
        vi.clearAllMocks()
        state = getDefaultState()
    })

    it('formats console events and inserts the helper tip banner', () => {
        state.events = [
            {
                date: new Date('2024-01-01T00:00:00Z'),
                message: 'ok',
                formatMessage: 'fmt:ok',
                type: 'command',
            },
        ]

        const result = (getters as any).getConsoleEvents(state)(false)

        expect(result).toHaveLength(2)
        expect(result[0].message).toContain('Type <a class="command text--blue">HELP</a>')
        expect(result[1].formatMessage).toBe('fmt:ok')
    })

    it('derives host stats, network interfaces, and throttled flags', () => {
        state.system_info = {
            available_services: [],
            cpu_info: {
                bits: '64',
                cpu_count: 2,
                cpu_desc: 'ARM Cortex',
                serial_number: '1',
                hardware_desc: 'board',
                memory_units: 'KB',
                model: 'test',
                processor: 'RPi',
                total_memory: 2,
            },
            distribution: {
                codename: 'noble',
                id: 'ubuntu',
                like: 'debian',
                name: 'Ubuntu',
                version: '24.04',
                version_parts: {
                    build_number: '1',
                    major: '24',
                    minor: '04',
                },
                release_info: {
                    name: 'Ubuntu',
                    version_id: '24.04',
                    id: 'ubuntu',
                },
            },
            sd_info: {
                capacity: '',
                manufacturer: '',
                manufacturer_date: '',
                manufacturer_id: '',
                oem_id: '',
                product_name: '',
                product_revision: '',
                serial_number: '',
                total_bytes: 0,
            },
            service_state: {},
            python: {
                version: ['3'],
                version_string: '3.11.2 (main)',
            },
            network: {
                eth0: {
                    mac_address: 'aa:bb',
                    ip_addresses: [],
                },
            },
            system_uptime: 10,
            instance_ids: {
                moonraker: 'm',
                klipper: 'k',
            },
        }
        state.cpu_temp = 44
        state.system_cpu_usage = { cpu: 12.6 }
        state.network_stats = {
            lo: { bandwidth: 1, rx_bytes: 1, tx_bytes: 1 },
            eth0: { bandwidth: 100, rx_bytes: 10, tx_bytes: 20 },
            can0: { bandwidth: 50, rx_bytes: 5, tx_bytes: 6 },
            wlan0: { bandwidth: 25, rx_bytes: 3, tx_bytes: 4 },
        }
        state.throttled_state = {
            bits: 3,
            flags: ['?', 'under-voltage'],
        }

        const hostStats = (getters as any).getHostStats(
            state,
            {},
            {
                printer: {
                    app_name: 'Klipper',
                    software_version: 'v1-2-3-4-5',
                    system_stats: {
                        sysload: 1.8,
                        memavail: 1,
                    },
                },
            },
            {
                'printer/getHostTempSensor': null,
            }
        )

        expect(hostStats.version).toBe('Klipper v1-2-3-4')
        expect(hostStats.pythonVersion).toBe('3.11.2 ')
        expect(hostStats.loadPercent).toBe(90)
        expect(hostStats.loadProgressColor).toBe('warning')
        expect(hostStats.memoryFormat).toBe('FS:1024 / FS:2048')
        expect(hostStats.memUsage).toBe(50)
        expect(hostStats.tempSensor.temperature).toBe('44')

        expect((getters as any).getCpuUsage(state)).toBe(13)
        expect((getters as any).getThrottledStateFlags(state)).toEqual(['Undervoltage'])
        expect((getters as any).getNetworkInterfaces(state)).toEqual({
            eth0: {
                bandwidth: 100,
                rx_bytes: 10,
                tx_bytes: 20,
                details: {
                    mac_address: 'aa:bb',
                    ip_addresses: [],
                },
            },
            can0: {
                bandwidth: 50,
                rx_bytes: 5,
                tx_bytes: 6,
            },
        })
    })

    it('applies mutations for gcode store and events', () => {
        mutations.setData(state, { klippy_state: 'ready', websocket_count: 2 } as any)
        expect(state.klippy_state).toBe('ready')
        expect(state.websocket_count).toBe(2)

        mutations.setGcodeStore(state, [
            { time: 1, type: 'response', message: '// debug: drop me' },
            { time: 2, type: 'command', message: 'G28' },
            { time: 3, type: 'response', message: 'ok' },
        ] as any)
        expect(state.events).toHaveLength(2)
        expect(state.events[0].type).toBe('command')
        expect(state.events[1].type).toBe('response')

        mutations.addEvent(state, {
            date: new Date('2024-01-01T00:00:00Z'),
            message: 'M117 Hi',
            formatMessage: 'fmt:M117 Hi',
            type: 'autocomplete',
        })
        mutations.addEvent(state, {
            date: new Date('2024-01-01T00:00:01Z'),
            message: 'M117 Hi',
            formatMessage: 'fmt:M117 Hi',
            type: 'command',
        })

        expect(state.events.at(-1)?.type).toBe('command')
        expect(state.events).toHaveLength(2)

        mutations.addFailedInitComponent(state, 'power')
        mutations.addFailedInitComponent(state, 'power')
        mutations.removeComponent(state, 'power')
        expect(state.failed_init_components).toEqual(['power'])
        expect(state.components).toEqual([])
    })

    it('filters and routes server actions', () => {
        const commit = vi.fn()
        const dispatch = vi.fn()

        actions.addEvent({ commit, rootGetters: { 'gui/console/getConsolefilterRules': [] } } as any, {
            message: '!! boom',
            type: 'response',
        })
        expect(commit).toHaveBeenCalledWith(
            'addEvent',
            expect.objectContaining({
                message: '!! boom',
                type: 'response',
            })
        )
        expect(mockToast.error).toHaveBeenCalled()

        actions.getGcodeStore(
            {
                commit,
                dispatch,
                rootGetters: {
                    'gui/console/getConsolefilterRules': ['skip'],
                    'gui/console/getConsoleClearedSince': 2000,
                },
            } as any,
            {
                gcode_store: [
                    { time: 1, type: 'response', message: 'old' },
                    { time: 3, type: 'response', message: 'skip me' },
                    { time: 4, type: 'response', message: 'keep me' },
                ],
            }
        )

        expect(commit).toHaveBeenCalledWith('clearGcodeStore')
        expect(commit).toHaveBeenCalledWith('setGcodeStore', [{ time: 4, type: 'response', message: 'keep me' }])
        expect(dispatch).toHaveBeenCalledWith('socket/removeInitModule', 'server/gcode_store', { root: true })
    })

    it('addEvent catches invalid regex filters and logs error', () => {
        const consoleSpy = vi.spyOn(window.console, 'error').mockImplementation(() => {})
        const commit = vi.fn()
        actions.addEvent({ commit, rootGetters: { 'gui/console/getConsolefilterRules': ['[invalid'] } } as any, {
            message: 'test message',
            type: 'response',
        })
        expect(consoleSpy).toHaveBeenCalledWith("Custom console filter '[invalid' doesn't work!")
        expect(commit).toHaveBeenCalled()
        consoleSpy.mockRestore()
    })

    it('getGcodeStore passes when cleared_since is falsy', () => {
        const commit = vi.fn()
        const dispatch = vi.fn()
        actions.getGcodeStore(
            {
                commit,
                dispatch,
                rootGetters: { 'gui/console/getConsolefilterRules': [], 'gui/console/getConsoleClearedSince': 0 },
            } as any,
            {
                gcode_store: [
                    { time: 1, type: 'response', message: 'hello' },
                    { time: 2, type: 'response', message: 'world' },
                ],
            }
        )
        expect(commit).toHaveBeenCalledWith('setGcodeStore', [
            { time: 1, type: 'response', message: 'hello' },
            { time: 2, type: 'response', message: 'world' },
        ])
    })

    it('getGcodeStore catches invalid regex filters', () => {
        const consoleSpy = vi.spyOn(window.console, 'error').mockImplementation(() => {})
        const commit = vi.fn()
        const dispatch = vi.fn()
        actions.getGcodeStore(
            {
                commit,
                dispatch,
                rootGetters: { 'gui/console/getConsolefilterRules': ['[bad'], 'gui/console/getConsoleClearedSince': 0 },
            } as any,
            {
                gcode_store: [{ time: 1, type: 'response', message: 'test' }],
            }
        )
        expect(consoleSpy).toHaveBeenCalledWith("Custom console filter '[bad' doesn't work")
        consoleSpy.mockRestore()
    })

    it('initServerInfo deletes plugins and failed_plugins keys from payload', () => {
        const commit = vi.fn()
        const dispatch = vi.fn()
        const payload: any = {
            components: ['power'],
            registered_directories: ['gcodes'],
            plugins: { somePlugin: {} },
            failed_plugins: ['broken'],
        }
        actions.initServerInfo({ dispatch, commit } as any, payload)
        expect(payload).not.toHaveProperty('plugins')
        expect(payload).not.toHaveProperty('failed_plugins')
        expect(commit).toHaveBeenCalledWith('setData', expect.not.objectContaining({ plugins: expect.anything() }))
    })

    it('initServerInfo handles empty components and registered_directories', () => {
        const commit = vi.fn()
        const dispatch = vi.fn()
        actions.initServerInfo({ dispatch, commit } as any, {
            components: [],
            registered_directories: [],
            klippy_state: 'ready',
        })
        expect(dispatch).not.toHaveBeenCalledWith(
            'socket/addInitModule',
            expect.stringContaining('server/'),
            expect.anything()
        )
        expect(dispatch).not.toHaveBeenCalledWith('files/initRootDirs', expect.anything(), expect.anything())
        expect(commit).toHaveBeenCalledWith('setData', {
            components: [],
            registered_directories: [],
            klippy_state: 'ready',
        })
        expect(dispatch).toHaveBeenCalledWith('socket/removeInitModule', 'server/info', { root: true })
    })

    it('getGcodeStore filters events by date when cleared_since is set', () => {
        const commit = vi.fn()
        const dispatch = vi.fn()
        const now = Date.now()
        actions.getGcodeStore(
            {
                commit,
                dispatch,
                rootGetters: { 'gui/console/getConsolefilterRules': [], 'gui/console/getConsoleClearedSince': now },
            } as any,
            {
                gcode_store: [
                    { time: Math.floor(now / 1000) + 100, type: 'response', message: 'future event' },
                    { type: 'response', message: 'old date event', date: new Date(now - 100000).toISOString() },
                ],
            }
        )
        expect(commit).toHaveBeenCalledWith(
            'setGcodeStore',
            expect.arrayContaining([expect.objectContaining({ message: 'future event' })])
        )
    })

    it('init handles non-Error exception', async () => {
        mockSocket.emitAndWait.mockRejectedValue('string error')
        const commit = vi.fn()
        const dispatch = vi.fn()
        const rootState = { packageVersion: 'v2.14.0' }
        const store = { dispatch }
        const consoleSpy = vi.spyOn(window.console, 'error').mockImplementation(() => {})

        await actions.init.bind(store)({ commit, dispatch, rootState } as any)

        expect(consoleSpy).toHaveBeenCalledWith('Error while identifying client: string error')
        expect(dispatch).not.toHaveBeenCalledWith('socket/setConnectionFailed', expect.anything())
        consoleSpy.mockRestore()
    })

    it('init succeeds with valid connection', async () => {
        mockSocket.emitAndWait.mockResolvedValue({ connection_id: 123 })
        const commit = vi.fn()
        const dispatch = vi.fn()
        const rootState = { packageVersion: 'v2.14.0' }
        const store = { dispatch }

        await actions.init.bind(store)({ commit, dispatch, rootState } as any)

        expect(mockSocket.emitAndWait).toHaveBeenCalledWith('server.connection.identify', {
            client_name: 'mainsail',
            version: 'v2.14.0',
            type: 'web',
            url: 'https://github.com/mainsail-crew/mainsail',
        })
        expect(commit).toHaveBeenCalledWith('setConnectionId', 123)
        expect(mockSocket.emit).toHaveBeenCalledWith('server.info', {}, { action: 'server/initServerInfo' })
        expect(dispatch).toHaveBeenCalledWith('socket/removeInitModule', 'server', { root: true })
    })

    it('init handles Unauthorized error', async () => {
        mockSocket.emitAndWait.mockRejectedValue(new Error('Unauthorized'))
        const commit = vi.fn()
        const dispatch = vi.fn()
        const rootState = { packageVersion: 'v2.14.0' }
        const store = { dispatch }

        await actions.init.bind(store)({ commit, dispatch, rootState } as any)
        expect(store.dispatch).toHaveBeenCalledWith('socket/setConnectionFailed', 'Unauthorized')
    })

    it('reset dispatches stop intervals and resets modules', () => {
        const commit = vi.fn()
        const dispatch = vi.fn()
        actions.reset({ commit, dispatch } as any)
        expect(dispatch).toHaveBeenCalledWith('stopKlippyConnectedInterval')
        expect(dispatch).toHaveBeenCalledWith('stopKlippyStateInterval')
        expect(commit).toHaveBeenCalledWith('reset')
        expect(dispatch).toHaveBeenCalledWith('power/reset')
        expect(dispatch).toHaveBeenCalledWith('updateManager/reset')
    })

    it('checkDatabases handles existing mainsail namespace', () => {
        const commit = vi.fn()
        const dispatch = vi.fn()
        actions.checkDatabases({ commit, dispatch } as any, { namespaces: ['mainsail', 'maintenance'] })
        expect(dispatch).toHaveBeenCalledWith('gui/init', null, { root: true })
        expect(dispatch).toHaveBeenCalledWith('gui/maintenance/init', null, { root: true })
        expect(commit).toHaveBeenCalledWith('saveDbNamespaces', ['mainsail', 'maintenance'])
    })

    it('checkDatabases handles missing namespaces', () => {
        const commit = vi.fn()
        const dispatch = vi.fn()
        actions.checkDatabases({ commit, dispatch } as any, { namespaces: [] })
        expect(dispatch).toHaveBeenCalledWith('gui/initDb', null, { root: true })
        expect(dispatch).toHaveBeenCalledWith('gui/maintenance/initDb', null, { root: true })
    })

    it('initServerConfig commits config', () => {
        const commit = vi.fn()
        const dispatch = vi.fn()
        actions.initServerConfig({ commit, dispatch } as any, { config: { server: { host: '0.0.0.0' } } })
        expect(commit).toHaveBeenCalledWith('setConfig', { config: { server: { host: '0.0.0.0' } } })
        expect(dispatch).toHaveBeenCalledWith('socket/removeInitModule', 'server/config', { root: true })
    })

    it('initSystemInfo commits system info', () => {
        const commit = vi.fn()
        const dispatch = vi.fn()
        actions.initSystemInfo({ commit, dispatch } as any, { system_info: { cpu_info: { cpu_count: 4 } } })
        expect(commit).toHaveBeenCalledWith('setSystemInfo', { cpu_info: { cpu_count: 4 } })
        expect(dispatch).toHaveBeenCalledWith('socket/removeInitModule', 'server/systemInfo', { root: true })
    })

    it('initProcStats handles throttled_state and system_uptime', () => {
        const commit = vi.fn()
        const dispatch = vi.fn()
        actions.initProcStats({ commit, dispatch } as any, {
            throttled_state: { bits: 0 },
            system_uptime: 3600,
        })
        expect(commit).toHaveBeenCalledWith('setThrottledState', { bits: 0 })
        expect(commit).toHaveBeenCalledWith('setSystemBootAt', expect.any(Date))
        expect(dispatch).toHaveBeenCalledWith('socket/removeInitModule', 'server/procStats', { root: true })
    })

    it('initProcStats handles null throttled_state', () => {
        const commit = vi.fn()
        const dispatch = vi.fn()
        actions.initProcStats({ commit, dispatch } as any, { throttled_state: null, system_uptime: null })
        expect(commit).not.toHaveBeenCalledWith('setThrottledState', expect.anything())
        expect(commit).not.toHaveBeenCalledWith('setSystemBootAt', expect.anything())
    })

    it('updateProcStats updates cpu temp, moonraker stats, network, cpu usage', () => {
        const commit = vi.fn()
        actions.updateProcStats({ commit } as any, {
            cpu_temp: 45,
            moonraker_stats: { cpu_usage: 12.5 },
            network: { eth0: { bandwidth: 100 } },
            system_cpu_usage: { cpu: 15 },
        })
        expect(commit).toHaveBeenCalledWith('setCpuTemp', 45)
        expect(commit).toHaveBeenCalledWith('setMoonrakerStats', { cpu_usage: 12.5 })
        expect(commit).toHaveBeenCalledWith('setNetworkStats', { eth0: { bandwidth: 100 } })
        expect(commit).toHaveBeenCalledWith('setCpuStats', { cpu: 15 })
    })

    it('updateProcStats handles partial payload', () => {
        const commit = vi.fn()
        actions.updateProcStats({ commit } as any, {})
        expect(commit).not.toHaveBeenCalled()
    })

    it('setKlippyReady stops intervals and inits printer', () => {
        const dispatch = vi.fn()
        actions.setKlippyReady({ dispatch } as any)
        expect(dispatch).toHaveBeenCalledWith('stopKlippyConnectedInterval')
        expect(dispatch).toHaveBeenCalledWith('stopKlippyStateInterval')
        expect(dispatch).toHaveBeenCalledWith('printer/reset', null, { root: true })
        expect(dispatch).toHaveBeenCalledWith('printer/init', null, { root: true })
    })

    it('setKlippyDisconnected commits and starts connected interval', () => {
        const commit = vi.fn()
        const dispatch = vi.fn()
        actions.setKlippyDisconnected({ commit, dispatch } as any)
        expect(commit).toHaveBeenCalledWith('setKlippyDisconnected', null)
        expect(dispatch).toHaveBeenCalledWith('stopKlippyStateInterval')
        expect(dispatch).toHaveBeenCalledWith('startKlippyConnectedInterval')
    })

    it('setKlippyShutdown commits and starts connected interval', () => {
        const commit = vi.fn()
        const dispatch = vi.fn()
        actions.setKlippyShutdown({ commit, dispatch } as any)
        expect(commit).toHaveBeenCalledWith('setKlippyShutdown', null)
        expect(dispatch).toHaveBeenCalledWith('stopKlippyStateInterval')
        expect(dispatch).toHaveBeenCalledWith('startKlippyConnectedInterval')
    })

    it('start/stop KlippyConnectedInterval lifecycle', () => {
        vi.useFakeTimers()
        const commit = vi.fn()
        state.klippy_connected_timer = null

        actions.startKlippyConnectedInterval({ commit, state } as any)
        expect(commit).toHaveBeenCalledWith('setKlippyConnectedTimer', expect.anything())

        vi.advanceTimersByTime(2000)
        expect(mockSocket.emit).toHaveBeenCalledWith('server.info', {}, { action: 'server/checkKlippyConnected' })

        // Manually update state as commit mock would
        state.klippy_connected_timer = true as any
        commit.mockClear()
        actions.startKlippyConnectedInterval({ commit, state } as any)
        expect(commit).not.toHaveBeenCalled()

        actions.stopKlippyConnectedInterval({ commit, state } as any)
        expect(commit).toHaveBeenCalledWith('setKlippyConnectedTimer', null)

        state.klippy_connected_timer = null
        commit.mockClear()
        actions.stopKlippyConnectedInterval({ commit, state } as any)
        expect(commit).not.toHaveBeenCalled()

        vi.useRealTimers()
    })

    it('checkKlippyConnected handles connected state', () => {
        const commit = vi.fn()
        const dispatch = vi.fn()
        actions.checkKlippyConnected({ commit, dispatch } as any, { klippy_connected: true, klippy_state: 'ready', klippy_state_message: null })
        expect(dispatch).toHaveBeenCalledWith('stopKlippyConnectedInterval')
        expect(commit).toHaveBeenCalledWith('setKlippyConnected')
        expect(dispatch).toHaveBeenCalledWith('printer/initGcodes', null, { root: true })
        expect(dispatch).toHaveBeenCalledWith('checkKlippyState', { state: 'ready', state_message: null })
    })

    it('checkKlippyConnected handles disconnected state', () => {
        const commit = vi.fn()
        const dispatch = vi.fn()
        actions.checkKlippyConnected({ commit, dispatch } as any, { klippy_connected: false })
        expect(dispatch).toHaveBeenCalledWith('startKlippyConnectedInterval')
        expect(commit).not.toHaveBeenCalled()
    })

    it('start/stop KlippyStateInterval lifecycle', () => {
        vi.useFakeTimers()
        const commit = vi.fn()
        state.klippy_state_timer = null

        actions.startKlippyStateInterval({ commit, state } as any)
        expect(commit).toHaveBeenCalledWith('setKlippyStateTimer', expect.anything())

        vi.advanceTimersByTime(2000)
        expect(mockSocket.emit).toHaveBeenCalledWith('printer.info', {}, { action: 'server/checkKlippyState' })

        state.klippy_state_timer = true as any
        commit.mockClear()
        actions.startKlippyStateInterval({ commit, state } as any)
        expect(commit).not.toHaveBeenCalled()

        actions.stopKlippyStateInterval({ commit, state } as any)
        expect(commit).toHaveBeenCalledWith('setKlippyStateTimer', null)

        state.klippy_state_timer = null
        commit.mockClear()
        actions.stopKlippyStateInterval({ commit, state } as any)
        expect(commit).not.toHaveBeenCalled()

        vi.useRealTimers()
    })

    it('checkKlippyState handles ready state', () => {
        const commit = vi.fn()
        const dispatch = vi.fn()
        actions.checkKlippyState({ commit, dispatch } as any, { state: 'ready', state_message: 'ok' })
        expect(commit).toHaveBeenCalledWith('setKlippyState', 'ready')
        expect(commit).toHaveBeenCalledWith('setKlippyMessage', 'ok')
        expect(dispatch).toHaveBeenCalledWith('stopKlippyConnectedInterval')
        expect(dispatch).toHaveBeenCalledWith('stopKlippyStateInterval')
        expect(dispatch).toHaveBeenCalledWith('printer/init', null, { root: true })
    })

    it('checkKlippyState handles non-ready state', () => {
        const commit = vi.fn()
        const dispatch = vi.fn()
        actions.checkKlippyState({ commit, dispatch } as any, { state: 'error', state_message: 'shutdown' })
        expect(commit).toHaveBeenCalledWith('setKlippyState', 'error')
        expect(commit).toHaveBeenCalledWith('setKlippyMessage', 'shutdown')
        expect(dispatch).toHaveBeenCalledWith('startKlippyStateInterval')
        expect(dispatch).not.toHaveBeenCalledWith('printer/init', expect.anything())
    })

    it('getData commits payload', () => {
        const commit = vi.fn()
        actions.getData({ commit } as any, { klippy_state: 'ready' })
        expect(commit).toHaveBeenCalledWith('setData', { klippy_state: 'ready' })
    })

    it('addRootDirectory adds new root directory', () => {
        const commit = vi.fn()
        state.registered_directories = ['gcodes']
        actions.addRootDirectory({ commit, state } as any, { item: { root: 'config' } })
        expect(commit).toHaveBeenCalledWith('addRootDirectory', { name: 'config' })
    })

    it('addRootDirectory skips existing directories', () => {
        const commit = vi.fn()
        state.registered_directories = ['gcodes']
        actions.addRootDirectory({ commit, state } as any, { item: { root: 'gcodes' } })
        expect(commit).not.toHaveBeenCalled()
    })

    it('addEvent handles various message formats', () => {
        const commit = vi.fn()
        const rootGetters = { 'gui/console/getConsolefilterRules': [] }

        // Object payload with result
        actions.addEvent({ commit, rootGetters } as any, { result: 'ok' })
        expect(commit).toHaveBeenCalledWith('addEvent', expect.objectContaining({ message: 'ok' }))

        // Object payload with error
        commit.mockClear()
        actions.addEvent({ commit, rootGetters } as any, { error: { message: 'fail' } })
        expect(commit).toHaveBeenCalledWith('addEvent', expect.objectContaining({ message: 'fail' }))
    })

    it('addEvent detects action and debug types', () => {
        const commit = vi.fn()
        const rootGetters = { 'gui/console/getConsolefilterRules': [] }

        actions.addEvent({ commit, rootGetters } as any, { message: '// action: test' })
        expect(commit).toHaveBeenCalledWith('addEvent', expect.objectContaining({ type: 'action' }))

        commit.mockClear()
        actions.addEvent({ commit, rootGetters } as any, { message: '// debug: test' })
        expect(commit).toHaveBeenCalledWith('addEvent', expect.objectContaining({ type: 'debug' }))
    })

    it('addEvent applies filter rules that exclude messages', () => {
        const commit = vi.fn()
        const rootGetters = { 'gui/console/getConsolefilterRules': ['test'] }

        actions.addEvent({ commit, rootGetters } as any, { message: 'test message' })
        expect(commit).not.toHaveBeenCalled()
    })

    it('addEvent formats command messages with HTML', () => {
        const commit = vi.fn()
        const rootGetters = { 'gui/console/getConsolefilterRules': [] }

        actions.addEvent({ commit, rootGetters } as any, { message: 'G28', type: 'command' })
        expect(commit).toHaveBeenCalledWith('addEvent', expect.objectContaining({
            formatMessage: expect.stringContaining('command text--blue'),
        }))
    })

    it('addEvent shows toast for errors on non-console routes', () => {
        const commit = vi.fn()
        const rootGetters = { 'gui/console/getConsolefilterRules': [] }

        actions.addEvent({ commit, rootGetters } as any, { message: '!! error', type: 'response' })
        expect(mockToast.error).toHaveBeenCalled()
    })

    it('addEvent does not show toast when on /console route', () => {
        mockRouter.currentRoute.path = '/console'
        const commit = vi.fn()
        const rootGetters = { 'gui/console/getConsolefilterRules': [] }

        actions.addEvent({ commit, rootGetters } as any, { message: '!! error', type: 'response' })
        expect(mockToast.error).not.toHaveBeenCalled()
        mockRouter.currentRoute.path = '/printer'
    })

    it('serviceStateChanged commits update', () => {
        const commit = vi.fn()
        actions.serviceStateChanged({ commit } as any, { klipper: { is_active: true } })
        expect(commit).toHaveBeenCalledWith('updateServiceState', { klipper: { is_active: true } })
    })

    it('addFailedInitComponent commits component removal and addition', () => {
        const commit = vi.fn()
        actions.addFailedInitComponent({ commit } as any, 'power')
        expect(commit).toHaveBeenCalledWith('removeComponent', 'power')
        expect(commit).toHaveBeenCalledWith('addFailedInitComponent', 'power')
    })

    describe('server/history/actions', () => {
        it('reset commits reset', () => {
            const commit = vi.fn()
            historyActions.reset({ commit } as any)
            expect(commit).toHaveBeenCalledWith('reset')
        })

        it('init emits history list and totals', () => {
            historyActions.init()
            expect(mockSocket.emit).toHaveBeenCalledWith(
                'server.history.list',
                { start: 0, limit: 50, max: 100 },
                { action: 'server/history/getHistory' }
            )
            expect(mockSocket.emit).toHaveBeenCalledWith(
                'server.history.totals',
                {},
                { action: 'server/history/getTotals' }
            )
        })

        it('getTotals sets job totals and auxiliary totals', () => {
            const commit = vi.fn()
            historyActions.getTotals({ commit } as any, {
                job_totals: { total_jobs: 10 },
                auxiliary_totals: ['test'],
            })
            expect(commit).toHaveBeenCalledWith('setTotals', { total_jobs: 10 })
            expect(commit).toHaveBeenCalledWith('setAuxiliaryTotals', ['test'])
        })

        it('getTotals handles empty auxiliary totals', () => {
            const commit = vi.fn()
            historyActions.getTotals({ commit } as any, { job_totals: { total_jobs: 0 } })
            expect(commit).toHaveBeenCalledWith('setTotals', { total_jobs: 0 })
            expect(commit).not.toHaveBeenCalledWith('setAuxiliaryTotals', expect.anything())
        })

        it('getHistory adds jobs and emits paginated requests', () => {
            const commit = vi.fn()
            const dispatch = vi.fn()
            const state: any = { jobs: [] }

            const jobs = Array.from({ length: 50 }, (_, i) => ({
                job_id: String(i).padStart(3, '0'),
                filename: `test${i}.gcode`,
            }))

            historyActions.getHistory({ commit, dispatch, state } as any, {
                requestParams: {},
                jobs,
            })

            expect(commit).toHaveBeenCalledWith('resetJobs')
            expect(commit).toHaveBeenCalledWith('addJob', { job_id: '000', filename: 'test0.gcode' })
            expect(mockSocket.emit).toHaveBeenCalledWith(
                'server.history.list',
                { start: 50, limit: 50, max: null },
                { action: 'server/history/getHistory' }
            )
        })

        it('getHistory marks all loaded when fewer jobs than limit', () => {
            const commit = vi.fn()
            const dispatch = vi.fn()
            const state: any = { jobs: [] }

            historyActions.getHistory({ commit, dispatch, state } as any, {
                requestParams: { start: 0, limit: 50 },
                jobs: [{ job_id: '001', filename: 'test.gcode' }],
            })

            expect(commit).toHaveBeenCalledWith('resetJobs')
            expect(commit).toHaveBeenCalledWith('addJob', { job_id: '001', filename: 'test.gcode' })
            expect(dispatch).toHaveBeenCalledWith('socket/removeLoading', { name: 'historyLoadAll' }, { root: true })
            expect(commit).toHaveBeenCalledWith('setAllLoaded')
        })

        it('getHistory handles payload without requestParams', () => {
            const commit = vi.fn()
            const dispatch = vi.fn()
            const state: any = { jobs: [] }

            historyActions.getHistory({ commit, dispatch, state } as any, {
                jobs: [{ job_id: '001', filename: 'test.gcode' }],
            })

            // Should not emit paginated request (fewer than 50 jobs)
            expect(commit).toHaveBeenCalledWith('addJob', { job_id: '001', filename: 'test.gcode' })
            expect(dispatch).toHaveBeenCalledWith('socket/removeLoading', { name: 'historyLoadAll' }, { root: true })
            expect(commit).toHaveBeenCalledWith('setAllLoaded')
        })

        it('getHistory skips duplicate jobs', () => {
            const commit = vi.fn()
            const dispatch = vi.fn()
            // Pre-populate state with a job that matches the incoming one
            state.jobs = [{ job_id: '001', filename: 'test.gcode' }] as any

            historyActions.getHistory({ commit, dispatch, state } as any, {
                requestParams: { start: 0, limit: 50 },
                jobs: [{ job_id: '001', filename: 'test.gcode' }],
            })

            // Should not add duplicate — only resetJobs + setAllLoaded + loadHistoryNotes dispatched
            expect(commit).toHaveBeenCalledWith('resetJobs')
            expect(commit).not.toHaveBeenCalledWith('addJob', expect.anything())
            expect(commit).toHaveBeenCalledWith('setAllLoaded')
        })

        it('loadHistoryNotes loads notes when namespace exists', () => {
            const dispatch = vi.fn()
            const rootState: any = { server: { dbNamespaces: ['history_notes'] } }

            historyActions.loadHistoryNotes({ dispatch, rootState } as any)
            expect(mockSocket.emit).toHaveBeenCalledWith(
                'server.database.get_item',
                { namespace: 'history_notes' },
                { action: 'server/history/initHistoryNotes' }
            )
        })

        it('loadHistoryNotes skips when namespace missing', () => {
            const dispatch = vi.fn()
            const rootState: any = { server: { dbNamespaces: [] } }

            historyActions.loadHistoryNotes({ dispatch, rootState } as any)
            expect(dispatch).toHaveBeenCalledWith('socket/removeInitModule', 'server/history/init', { root: true })
        })

        it('initHistoryNotes commits notes and removes init module', async () => {
            const commit = vi.fn()
            const dispatch = vi.fn()

            await historyActions.initHistoryNotes({ commit, dispatch } as any, {
                value: { '001': { text: 'first print note' }, '002': { text: 'second note' } },
            })

            expect(commit).toHaveBeenCalledWith('setHistoryNotes', { job_id: '001', text: 'first print note' })
            expect(commit).toHaveBeenCalledWith('setHistoryNotes', { job_id: '002', text: 'second note' })
            expect(dispatch).toHaveBeenCalledWith('socket/removeInitModule', 'server/history/init', { root: true })
        })

        it('getChanged handles added action', () => {
            const commit = vi.fn()
            historyActions.getChanged({ commit } as any, { action: 'added', job: { job_id: '001' } })
            expect(commit).toHaveBeenCalledWith('addJob', { job_id: '001' })
        })

        it('getChanged handles finished action', () => {
            const commit = vi.fn()
            historyActions.getChanged({ commit } as any, { action: 'finished', job: { job_id: '001' } })
            expect(commit).toHaveBeenCalledWith('updateJob', { job_id: '001' })
        })

        it('getChanged handles unknown action gracefully', () => {
            const commit = vi.fn()
            historyActions.getChanged({ commit } as any, { action: 'unknown', job: { job_id: '001' } })
            // No commit should happen, but getTotals emit should still fire
            expect(commit).not.toHaveBeenCalled()
            expect(mockSocket.emit).toHaveBeenCalledWith(
                'server.history.totals',
                {},
                { action: 'server/history/getTotals' }
            )
        })

        it('getDeletedJobs removes deleted jobs', () => {
            const commit = vi.fn()
            historyActions.getDeletedJobs({ commit } as any, { deleted_jobs: ['001', '002'] })
            expect(commit).toHaveBeenCalledWith('destroyJob', '001')
            expect(commit).toHaveBeenCalledWith('destroyJob', '002')
        })

        it('getDeletedJobs handles missing deleted_jobs', () => {
            const commit = vi.fn()
            historyActions.getDeletedJobs({ commit } as any, {})
            expect(commit).not.toHaveBeenCalled()
        })

        it('saveHistoryNote emits database post and commits', () => {
            const commit = vi.fn()
            historyActions.saveHistoryNote({ commit } as any, { job_id: '001', note: 'my note' })
            expect(mockSocket.emit).toHaveBeenCalledWith('server.database.post_item', {
                namespace: 'history_notes',
                key: '001',
                value: { text: 'my note' },
            })
            expect(commit).toHaveBeenCalledWith('setHistoryNotes', { job_id: '001', text: 'my note' })
        })
    })

    describe('server/jobQueue/actions', () => {
        it('reset commits reset', () => {
            const commit = vi.fn()
            jobQueueActions.reset({ commit } as any)
            expect(commit).toHaveBeenCalledWith('reset')
        })

        it('init emits status request', () => {
            jobQueueActions.init()
            expect(mockSocket.emit).toHaveBeenCalledWith(
                'server.job_queue.status',
                {},
                { action: 'server/jobQueue/getStatus' }
            )
        })

        it('getEvent updates queue and state', () => {
            const commit = vi.fn()
            jobQueueActions.getEvent({ commit } as any, {
                updated_queue: [{ job_id: '001' }],
                queue_state: 'ready',
            })
            expect(commit).toHaveBeenCalledWith('setQueuedJobs', [{ job_id: '001' }])
            expect(commit).toHaveBeenCalledWith('setQueueState', 'ready')
        })

        it('getEvent handles partial payload', () => {
            const commit = vi.fn()
            jobQueueActions.getEvent({ commit } as any, { updated_queue: [] })
            expect(commit).toHaveBeenCalledWith('setQueuedJobs', [])
        })

        it('getStatus commits queue data and removes init module', async () => {
            const commit = vi.fn()
            const dispatch = vi.fn()
            await jobQueueActions.getStatus({ commit, dispatch } as any, {
                queued_jobs: [{ job_id: '001' }],
                queue_state: 'paused',
            })
            expect(commit).toHaveBeenCalledWith('setQueuedJobs', [{ job_id: '001' }])
            expect(commit).toHaveBeenCalledWith('setQueueState', 'paused')
            expect(dispatch).toHaveBeenCalledWith('socket/removeInitModule', 'server/jobQueue/init', { root: true })
        })

        it('addToQueue emits post_job', async () => {
            await jobQueueActions.addToQueue(undefined as any, ['test.gcode'])
            expect(mockSocket.emit).toHaveBeenCalledWith('server.job_queue.post_job', { filenames: ['test.gcode'] })
        })

        it('changeCount updates count and dispatches sendNewQueueList', () => {
            const dispatch = vi.fn()
            const gettersMock = { getJobs: [{ job_id: '001', filename: 'test.gcode' }] }
            jobQueueActions.changeCount({ dispatch, getters: gettersMock } as any, { job_id: '001', count: 3 })
            expect(dispatch).toHaveBeenCalledWith('sendNewQueueList', { jobs: expect.any(Array) })
        })

        it('changeCount returns early for unknown job', () => {
            const dispatch = vi.fn()
            const gettersMock = { getJobs: [] }
            jobQueueActions.changeCount({ dispatch, getters: gettersMock } as any, { job_id: 'unknown', count: 1 })
            expect(dispatch).not.toHaveBeenCalled()
        })

        it('changePosition splices and dispatches', () => {
            const dispatch = vi.fn()
            const gettersMock = { getJobs: [{ job_id: '001', filename: 'a.gcode' }, { job_id: '002', filename: 'b.gcode' }] }
            jobQueueActions.changePosition({ dispatch, getters: gettersMock } as any, { oldIndex: 0, newIndex: 1 })
            expect(dispatch).toHaveBeenCalledWith('sendNewQueueList', { jobs: expect.any(Array) })
        })

        it('startByJobId moves job to front and dispatches with printStart', () => {
            const dispatch = vi.fn()
            const gettersMock = { getJobs: [{ job_id: '001', filename: 'a.gcode' }, { job_id: '002', filename: 'b.gcode' }] }
            jobQueueActions.startByJobId({ dispatch, getters: gettersMock } as any, '002')
            expect(dispatch).toHaveBeenCalledWith('sendNewQueueList', expect.objectContaining({ printStart: true }))
        })

        it('startByJobId returns early for unknown job', () => {
            const dispatch = vi.fn()
            jobQueueActions.startByJobId({ dispatch, getters: { getJobs: [] } } as any, 'unknown')
            expect(dispatch).not.toHaveBeenCalled()
        })

        it('sendNewQueueList emits flat filenames', () => {
            const jobs = [
                { job_id: '001', filename: 'single.gcode' },
                { job_id: '002', filename: 'multi.gcode', combinedIds: ['002', '002'] },
            ] as any

            jobQueueActions.sendNewQueueList(undefined as any, { jobs })
            expect(mockSocket.emit).toHaveBeenCalledWith(
                'server.job_queue.post_job',
                { filenames: ['single.gcode', 'multi.gcode', 'multi.gcode', 'multi.gcode'], reset: true },
                {}
            )
        })

        it('sendNewQueueList includes action when printStart is true', () => {
            const jobs = [{ job_id: '001', filename: 'test.gcode' }] as any

            jobQueueActions.sendNewQueueList(undefined as any, { jobs, printStart: true })
            expect(mockSocket.emit).toHaveBeenCalledWith(
                'server.job_queue.post_job',
                { filenames: ['test.gcode'], reset: true },
                { action: 'server/jobQueue/start' }
            )
        })

        it('deleteFromQueue emits delete_job', () => {
            jobQueueActions.deleteFromQueue(undefined as any, ['001', '002'])
            expect(mockSocket.emit).toHaveBeenCalledWith('server.job_queue.delete_job', { job_ids: ['001', '002'] })
        })

        it('clearQueue emits delete_job with all: true', () => {
            jobQueueActions.clearQueue()
            expect(mockSocket.emit).toHaveBeenCalledWith('server.job_queue.delete_job', { all: true })
        })

        it('start emits start', () => {
            jobQueueActions.start()
            expect(mockSocket.emit).toHaveBeenCalledWith(
                'server.job_queue.start',
                {},
                { loading: 'startJobqueue' }
            )
        })

        it('pause emits pause', () => {
            jobQueueActions.pause()
            expect(mockSocket.emit).toHaveBeenCalledWith(
                'server.job_queue.pause',
                {},
                { loading: 'pauseJobqueue' }
            )
        })
    })

    describe('server/timelapse/actions', () => {
        it('reset commits reset', () => {
            const commit = vi.fn()
            timelapseActions.reset({ commit } as any)
            expect(commit).toHaveBeenCalledWith('reset')
        })

        it('init emits settings and lastframe requests', () => {
            timelapseActions.init()
            expect(mockSocket.emit).toHaveBeenCalledWith(
                'machine.timelapse.get_settings',
                {},
                { action: 'server/timelapse/initSettings' }
            )
            expect(mockSocket.emit).toHaveBeenCalledWith(
                'machine.timelapse.lastframeinfo',
                {},
                { action: 'server/timelapse/initLastFrameinfo' }
            )
        })

        it('initSettings strips requestParams and commits settings', async () => {
            const commit = vi.fn()
            const dispatch = vi.fn()
            await timelapseActions.initSettings({ commit, dispatch } as any, {
                enabled: true,
                requestParams: {},
            })
            expect(commit).toHaveBeenCalledWith('setSettings', { enabled: true })
            expect(dispatch).toHaveBeenCalledWith('socket/removeInitModule', 'server/timelapse/init', { root: true })
        })

        it('initLastFrameinfo commits last frame data', () => {
            const commit = vi.fn()
            timelapseActions.initLastFrameinfo({ commit } as any, {
                framecount: 42,
                lastframefile: 'test.jpg',
            })
            expect(commit).toHaveBeenCalledWith('setLastFrame', { count: 42, file: 'test.jpg' })
        })

        it('getEvent handles newframe action', () => {
            const commit = vi.fn()
            timelapseActions.getEvent({ commit } as any, { action: 'newframe', frame: '10', framefile: 'img.jpg' })
            expect(commit).toHaveBeenCalledWith('setLastFrame', { count: 10, file: 'img.jpg' })
        })

        it('getEvent handles render error', () => {
            const commit = vi.fn()
            timelapseActions.getEvent({ commit } as any, { action: 'render', status: 'error', msg: 'render failed' })
            // $toast.error receives the raw message, not formatConsoleMessage output
            expect(mockToast.error).toHaveBeenCalledWith('render failed')
            expect(commit).toHaveBeenCalledWith('resetSnackbar')
        })

        it('getEvent handles render success', () => {
            const commit = vi.fn()
            timelapseActions.getEvent({ commit } as any, { action: 'render', status: 'success', msg: 'done' })
            expect(commit).toHaveBeenCalledWith('setRenderStatus', { action: 'render', status: 'success', msg: 'done' })
        })

        it('getEvent handles unknown action', () => {
            const consoleSpy = vi.spyOn(window.console, 'log').mockImplementation(() => {})
            timelapseActions.getEvent({} as any, { action: 'unknown' })
            expect(consoleSpy).toHaveBeenCalledWith('unknown timelapse event', { action: 'unknown' })
            consoleSpy.mockRestore()
        })

        it('saveSetting emits post_settings', () => {
            timelapseActions.saveSetting(undefined as any, { enabled: true })
            expect(mockSocket.emit).toHaveBeenCalledWith(
                'machine.timelapse.post_settings',
                { enabled: true },
                { action: 'server/timelapse/initSettings' }
            )
        })

        it('updateCamSettings updates when camera matches', () => {
            const dispatch = vi.fn()
            const state: any = { settings: { camera: 'cam1' } }
            timelapseActions.updateCamSettings({ dispatch, state } as any, { oldName: 'cam1', newName: 'cam2' })
            expect(dispatch).toHaveBeenCalledWith('saveSetting', { camera: 'cam2' })
        })

        it('updateCamSettings skips when camera does not match', () => {
            const dispatch = vi.fn()
            const state: any = { settings: { camera: 'cam1' } }
            timelapseActions.updateCamSettings({ dispatch, state } as any, { oldName: 'other_cam', newName: 'cam2' })
            expect(dispatch).not.toHaveBeenCalled()
        })

        it('resetSnackbar commits reset', () => {
            const commit = vi.fn()
            timelapseActions.resetSnackbar({ commit } as any)
            expect(commit).toHaveBeenCalledWith('resetSnackbar')
        })
    })
})
