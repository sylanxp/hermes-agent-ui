<template>
  <n-config-provider :theme="isDark ? darkTheme : null" :locale="zhCN" :date-locale="dateZhCN">
    <n-loading-bar-provider>
      <n-message-provider>
        <n-notification-provider>
          <n-dialog-provider>
            <router-view />
          </n-dialog-provider>
        </n-notification-provider>
      </n-message-provider>
    </n-loading-bar-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { ref, provide } from 'vue'
import { 
  NConfigProvider, 
  NLoadingBarProvider, 
  NMessageProvider, 
  NNotificationProvider, 
  NDialogProvider,
  darkTheme,
  zhCN,
  dateZhCN
} from 'naive-ui'

const isDark = ref(true)
provide('isDark', isDark)
</script>