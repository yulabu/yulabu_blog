<template>
  <div class="settings-page">
    <AdminPageCard
      title="系统设置"
      subtitle="保存后立即对前台生效"
      :loading="loading"
      :empty="!loading && loadFailed"
      empty-text="设置读取失败，请刷新重试"
    >
      <div class="settings-form">
        <AdminFormField hint="关闭后文章页不再显示评论区；GitHub Discussions 里已有的评论不受影响，重新开启即恢复">
          <AdminFormCheckbox v-model="form.comments_enabled" label="开启文章页评论区" />
        </AdminFormField>

        <div class="settings-actions">
          <AdminButton variant="primary" :loading="saving" :disabled="!dirty" @click="onSave">
            保存
          </AdminButton>
        </div>
      </div>
    </AdminPageCard>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useMessageBox } from '@/composables/useMessageBox'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { getSettings, updateSettings } from '@/api/setting'
import AdminPageCard from '@/components/admin/AdminPageCard.vue'
import AdminButton from '@/components/admin/AdminButton.vue'
import AdminFormField from '@/components/admin/forms/AdminFormField.vue'
import AdminFormCheckbox from '@/components/admin/forms/AdminFormCheckbox.vue'

const { toast } = useMessageBox()

// 默认值与 server/config/settings.js 保持一致：读不到设置项时按开启展示
const DEFAULT_SETTINGS = { comments_enabled: true }

const loading = ref(false)
const loadFailed = ref(false)
const form = ref({ ...DEFAULT_SETTINGS })
const saved = ref({ ...DEFAULT_SETTINGS })

const dirty = computed(() => form.value.comments_enabled !== saved.value.comments_enabled)

async function fetchSettings() {
  loading.value = true
  try {
    const data = await getSettings()
    form.value = { ...DEFAULT_SETTINGS, ...data }
    saved.value = { ...form.value }
    loadFailed.value = false
  } catch (e) {
    // 读失败时不展示表单：避免拿默认值当现状去覆盖真实设置
    loadFailed.value = true
    toast('读取系统设置失败', 'error')
  } finally {
    loading.value = false
  }
}

onMounted(fetchSettings)

const { run: runSave, loading: saving } = useAsyncAction(
  () => updateSettings({ comments_enabled: form.value.comments_enabled }),
  {
    successMessage: (result) => result.message || '设置已保存',
    onSuccess: () => {
      saved.value = { ...form.value }
    }
  }
)

function onSave() {
  return runSave()
}
</script>

<style scoped>
.settings-page {
  width: 100%;
}

.settings-form {
  max-width: 520px;
}

.settings-actions {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--border-divider);
}
</style>
