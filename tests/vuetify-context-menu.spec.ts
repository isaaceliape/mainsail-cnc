import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'fs'
import { resolve } from 'path'

function findVueFiles(dir: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name)
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      files.push(...findVueFiles(full))
    } else if (entry.isFile() && entry.name.endsWith('.vue')) {
      files.push(full)
    }
  }
  return files
}

describe('Vuetify 3 context menu positioning', () => {
  // In Vuetify 3, v-menu with position-x/position-y (viewport-relative)
  // must NOT have `absolute` — absolute forces parent-relative positioning,
  // causing the menu to appear at the wrong coordinates when the values
  // come from mouse event clientX/clientY.
  // See: commit fbdbd17b (fix) and 22dd93a5 (original fix)

  const srcDir = resolve(__dirname, '../src')
  const vueFiles = findVueFiles(srcDir)

  it('should never combine absolute with position-x/position-y on a v-menu', () => {
    const violations: string[] = []

    for (const file of vueFiles) {
      const content = readFileSync(file, 'utf-8')

      // Match <v-menu ... absolute ... :position-x=...>
      // or <v-menu ... :position-x=... ... absolute ...>
      const absolutePos = /<v-menu(?=[^>]*\babsolute\b)(?=[^>]*\b:?position-x\s*=)/gi
      const absolutePosY = /<v-menu(?=[^>]*\babsolute\b)(?=[^>]*\b:?position-y\s*=)/gi

      // Check both patterns (position-x and position-y alone are enough to flag)
      let match: RegExpExecArray | null
      while ((match = absolutePos.exec(content)) !== null) {
        const line = content.slice(0, match.index).split('\n').length
        violations.push(`${file}:${line}`)
      }
      while ((match = absolutePosY.exec(content)) !== null) {
        const line = content.slice(0, match.index).split('\n').length
        violations.push(`${file}:${line}`)
      }
    }

    // Deduplicate (a single element may match both patterns)
    const unique = Array.from(new Set(violations))

    expect(unique).toEqual([])
  })
})
