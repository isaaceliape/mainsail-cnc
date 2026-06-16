# Upstream Mainsail — Candidate Changes

Analysis of commits on `mainsail-crew/mainsail:develop` since our fork point
that are worth re-implementing in mainsail-cnc's Vue 3 `<script setup>` stack.

## Change 1: `executable` type in update manager

**Upstream**: `04fbaeed` — feat(UpdatePanel): add support for executable type

**What it does**: Moonraker's update manager now supports `type: executable`
for tracking standalone binaries (e.g. agents, servers). Previously only
`web`, `web_beta`, and `python` types were routed to the `storeWebRepo`
commit handler. Adds `'executable'` to all type-check arrays.

**Relevant files**:
- `src/store/server/updateManager/actions.ts` — dispatch to `storeWebRepo`
  for executable type
- `src/components/panels/Machine/UpdatePanel/Entry.vue` — show update UI
  for executable type (version badge, semver check, button)

**Implementation in `<script setup>`**:
```typescript
// actions.ts — add 'executable' to the web repo dispatch:
if (['web', 'web_beta', 'python', 'executable'].includes(configured_type)) {
```

```typescript
// Entry.vue — add 'executable' to every semver type array:
['python', 'web'] → ['python', 'web', 'executable']
// occurs in: btnDisabled, btnIcon, btnColor, btnText computed properties
// and the template v-else-if for semver update link
```

## Change 2: `zip` type in semver-based update checks

**Upstream**: `cbabdb47` — fix(UpdatePanel): add zip type to semver-based checks

**What it does**: Moonraker now reports `type: zip` for web-style repos.
The update panel needs to treat `zip` the same as `web`/`python`/`executable`
for semver version comparison. Refactors the repeated inline type arrays
into a single `isSemverType` computed property.

**Relevant files**:
- `src/components/panels/Machine/UpdatePanel/Entry.vue`

**Implementation in `<script setup>`**:
```typescript
// Add a computed:
const isSemverType = computed(() =>
    ['web', 'python', 'executable', 'zip'].includes(type.value)
)

// Then replace every ['python', 'web'].includes(type.value) with:
isSemverType.value
```

## Change 3: Dependency bumps (already applied)

| Package | From | To | Type | Status |
|---------|------|----|------|--------|
| vite | ^7.3.2 | ^7.3.5 | dev | ✅ Applied |
| vitest | ^3.2.4 | ^3.2.6 | dev | ✅ Applied |
| @vitest/coverage-v8 | ^3.2.4 | ^3.2.6 | dev | ✅ Applied |
| js-yaml | ^4.1.1 | ^4.2.0 | dev | ⏭️ Not in our deps |
| markdown-it | ^14.1.1 | ^14.2.0 | prod | ⏭️ Not in our deps |
| form-data | ^4.0.5 | ^4.0.6 | prod | ⏭️ Not in our deps |
| tmp | 0.2.5 | 0.2.7 | dev | ⏭️ Not in our deps |

## Skipped (3D-printing specific)

| Commit | Reason |
|--------|--------|
| `f71e9cfc` | Spoolman filament fix — Spoolman removed from fork |
| `ceb732fa` | Z offset panel error — Z offset panel removed |
| `b903c6cd` | SHT4X temperature sensor — 3D-printing specific |
| `6f877b3b` | PR template update — trivial |
