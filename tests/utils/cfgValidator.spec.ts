import { describe, expect, it } from 'vitest'
import { validateCfg } from '@/utils/cfgValidator'

describe('cfgValidator', () => {
    it('accepts valid Klipper macro syntax and merged sections', async () => {
        const content = `
[include macros/*.cfg]

[gcode_macro START_JOB]
description: Home all axes
gcode:
  G90
  G28
  M117 Ready
  {% if printer.toolhead.homed_axes != "xyz" %}
    RESPOND TYPE=error MSG="Not homed"
  {% endif %}

[display_status]
[display_status]
`

        const errors = await validateCfg(content, 'macros.cfg')

        expect(errors).toEqual([])
    })

    it('accepts multiline option continuation lines', async () => {
        const content = `
[respond]
default_type: command
prefix:
  long
  multiline
  value
`

        const errors = await validateCfg(content, 'respond.cfg')

        expect(errors).toEqual([])
    })

    it('reports malformed section headers', async () => {
        const errors = await validateCfg('[gcode_macro TEST', 'broken.cfg')

        expect(errors).toEqual([
            expect.objectContaining({
                line: 1,
                severity: 'error',
                message: expect.stringContaining('Unclosed section header'),
            }),
        ])
    })

    it('reports empty section headers', async () => {
        const errors = await validateCfg('[]', 'broken.cfg')

        expect(errors).toEqual([
            expect.objectContaining({
                line: 1,
                severity: 'error',
                message: expect.stringContaining('Empty section header'),
            }),
        ])
    })

    it('reports content outside of a section', async () => {
        const errors = await validateCfg('G90', 'broken.cfg')

        expect(errors).toEqual([
            expect.objectContaining({
                line: 1,
                severity: 'error',
                message: expect.stringContaining('Content outside of any section'),
            }),
        ])
    })

    it('reports invalid non-indented lines inside a section', async () => {
        const content = `[printer]
kinematics cartesian`

        const errors = await validateCfg(content, 'broken.cfg')

        expect(errors).toEqual([
            expect.objectContaining({
                line: 2,
                severity: 'error',
                message: expect.stringContaining('Expected option syntax'),
            }),
        ])
    })

    it('reports missing key names', async () => {
        const content = `[printer]
= 123`

        const errors = await validateCfg(content, 'broken.cfg')

        expect(errors).toEqual([
            expect.objectContaining({
                line: 2,
                severity: 'error',
                message: expect.stringContaining('Missing key name'),
            }),
        ])
    })

    it('warns when an included file cannot be resolved', async () => {
        const content = '[include missing.cfg]'

        const errors = await validateCfg(content, 'broken.cfg', async () => null)

        expect(errors).toEqual([
            expect.objectContaining({
                line: 1,
                severity: 'warning',
                message: expect.stringContaining('Included file not found'),
            }),
        ])
    })

    it('tracks included files by full resolved path instead of basename', async () => {
        const content = `
[include macros/start.cfg]
[include overrides/start.cfg]
`

        const includeMap = new Map([
            ['macros/start.cfg', '[printer]\nkinematics cartesian'],
            ['overrides/start.cfg', '[printer]\nkinematics: cartesian'],
        ])

        const errors = await validateCfg(content, 'printer.cfg', async (path) => includeMap.get(path) ?? null)

        expect(errors).toEqual([
            expect.objectContaining({
                line: 2,
                severity: 'error',
                message: expect.stringContaining('Expected option syntax'),
            }),
        ])
    })
})
