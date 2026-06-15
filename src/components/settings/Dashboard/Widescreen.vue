<template>
    <v-card flat>
        <v-card-text>
            <div class="dashboard-widescreen-layout">
                <div class="dashboard-widescreen-layout__primary d-flex">
                    <settings-dashboard-sortable viewport-name="widescreen" :column="1" />
                </div>
                <div class="dashboard-widescreen-layout__secondary">
                    <div class="dashboard-widescreen-layout__stack-item d-flex">
                        <settings-dashboard-sortable viewport-name="widescreen" :column="2" />
                    </div>
                    <div class="dashboard-widescreen-layout__stack-item d-flex">
                        <settings-dashboard-sortable viewport-name="widescreen" :column="3" />
                    </div>
                </div>
            </div>
            <v-row>
                <v-col class="text-center">
 <v-btn color="error" @click="resetLayout">{{ $t('Settings.DashboardTab.ResetLayout') }}</v-btn>
                </v-col>
            </v-row>
        </v-card-text>
    </v-card>
</template>

<script setup lang="ts">
import { useStore } from 'vuex'
import SettingsDashboardSortable from '@/components/settings/Dashboard/Sortable.vue'

const store = useStore()

function resetLayout() {
    store.dispatch('gui/resetLayout', 'widescreenLayout1')
    store.dispatch('gui/resetLayout', 'widescreenLayout2')
    store.dispatch('gui/resetLayout', 'widescreenLayout3')
}
</script>

<style scoped>
.dashboard-widescreen-layout {
    display: grid;
    gap: 16px;
}

.dashboard-widescreen-layout__secondary {
    display: grid;
    gap: 16px;
}

@media (min-width: 960px) {
    .dashboard-widescreen-layout {
        grid-template-columns: minmax(0, 2fr) minmax(0, 3fr);
        align-items: start;
    }
}
</style>
