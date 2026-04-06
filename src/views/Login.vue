<template>
  <div class="login-container">
    <n-card class="login-card" :bordered="false">
      <div class="login-header">
        <img src="/favicon.svg" alt="Hermes" class="login-logo" />
        <h1>Hermes Dashboard</h1>
        <p>AI 智能体管理平台</p>
      </div>
      <n-form ref="formRef" :model="formValue" :rules="rules" size="large">
        <n-form-item path="username">
          <n-input 
            v-model:value="formValue.username" 
            placeholder="用户名"
            :input-props="{ autocomplete: 'username' }"
          >
            <template #prefix>
              <n-icon><PersonOutline /></n-icon>
            </template>
          </n-input>
        </n-form-item>
        <n-form-item path="password">
          <n-input 
            v-model:value="formValue.password" 
            type="password" 
            placeholder="密码"
            show-password-on="click"
            :input-props="{ autocomplete: 'current-password' }"
            @keyup.enter="handleLogin"
          >
            <template #prefix>
              <n-icon><LockClosedOutline /></n-icon>
            </template>
          </n-input>
        </n-form-item>
        <n-form-item>
          <n-button 
            type="primary" 
            block 
            :loading="loading" 
            @click="handleLogin"
          >
            登 录
          </n-button>
        </n-form-item>
      </n-form>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { PersonOutline, LockClosedOutline } from '@vicons/ionicons5'

const router = useRouter()
const message = useMessage()

const formRef = ref()
const loading = ref(false)
const formValue = ref({
  username: '',
  password: ''
})

const rules = {
  username: { required: true, message: '请输入用户名', trigger: 'blur' },
  password: { required: true, message: '请输入密码', trigger: 'blur' }
}

const handleLogin = async () => {
  await formRef.value?.validate()
  loading.value = true
  
  // 模拟登录验证
  setTimeout(() => {
    if (formValue.value.username === 'admin' && formValue.value.password === 'admin') {
      message.success('登录成功')
      router.push('/dashboard')
    } else {
      message.error('用户名或密码错误')
    }
    loading.value = false
  }, 500)
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
}

.login-card {
  width: 400px;
  padding: 40px;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-radius: 16px;
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.login-logo {
  width: 64px;
  height: 64px;
  margin-bottom: 16px;
}

.login-header h1 {
  font-size: 24px;
  color: #fff;
  margin-bottom: 8px;
}

.login-header p {
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
}
</style>