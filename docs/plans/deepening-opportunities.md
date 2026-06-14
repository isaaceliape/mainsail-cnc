# Deepening Opportunities

## Scope

This plan records the four architectural deepening candidates surfaced during review.

## Order

1. CAM metadata
2. CNC profile
3. WCS / OffsetPreview
4. Dashboard catalog

## 1. CAM Metadata

### Goal

Make `src/store/files/cncMetadata.ts` the deep module for CAM sidecar loading and shaping.

### Files

- `src/store/files/cncMetadata.ts`
- `src/components/panels/Gcodefiles/GcodefilesPanelListCardFile.vue`
- `src/components/panels/Cnc/CncStatusPanel.vue`
- `tests/store/files/cncMetadata.spec.ts`

### Plan

- Add one entry point: `loadCncMetadataViewModel(apiUrl, filename)`.
- Move sidecar path construction into `cncMetadata.ts`.
- Keep callers on `viewModel | null`.
- Update tests to cover request path, fallback, and shaping.

### Contract

- Return `null` on any failure.
- Hide fetch and parse details from callers.

## 2. CNC Profile

### Goal

Make `src/composables/useCncProfile.ts` the machine policy module.

### Files

- `src/composables/useCncProfile.ts`
- `src/store/files/cncApi.ts`
- `src/components/panels/Cnc/Wcs.vue`
- `src/components/panels/Cnc/CncStatusPanel.vue`
- `src/components/panels/Cnc/DroPanel.vue`
- `src/components/panels/Cnc/MdiPanel.vue`
- `src/components/panels/Cnc/SpindleCoolantPanel.vue`

### Plan

- Keep raw state loading inside `useCncProfile`.
- Expose `machineName` plus one immutable `machinePolicy` object.
- Move all panel policy checks to the policy object.
- Reduce repeated flag derivation in callers.

### Contract

- `machinePolicy` contains booleans and counts only.
- `machineName` stays separate.

## 3. WCS / OffsetPreview

### Goal

Make `OffsetPreview` pure and generic while `Wcs.vue` owns actions and persistence.

### Files

- `src/components/panels/Cnc/Wcs.vue`
- `src/composables/useCncOffsets.ts`
- `src/store/files/cncApi.ts`
- `tests/components/OffsetPreview.spec.ts`

### Plan

- Keep WCS names, commands, store access, and persistence in `Wcs.vue`.
- Give `OffsetPreview` plain inputs only.
- Keep `OffsetPreview` generic over offset entries, not WCS names.
- Preserve local persistence in `Wcs.vue`.

### Contract

- `OffsetPreview` owns geometry and display.
- `Wcs.vue` owns user intents and side effects.

## 4. Dashboard Catalog

### Goal

Make one panel catalog module own dashboard metadata and layout rules.

### Files

- `src/pages/Dashboard.vue`
- `src/store/gui/getters.ts`
- `src/store/gui/index.ts`
- `src/store/variables.ts`
- `src/composables/useDashboard.ts`

### Plan

- Move panel metadata into one catalog module.
- Keep `Dashboard.vue` as the only consumer.
- Remove `useDashboard`.
- Make `cncMode` filtering and default viewport layouts declarative.
- Keep unknown panels as explicit failures.

### Contract

- Catalog exposes one data object plus tiny lookup helpers.
- Layout selection remains a simple helper.

## Verification

- Run `bun run build` after each completed change set.
- Extend or update the nearest tests for the affected module.
- Prefer module-level tests first, then panel-level coverage where behavior crosses seams.
