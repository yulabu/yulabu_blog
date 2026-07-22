<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import Navbar from '@/components/Navbar.vue'
import MessageBox from '@/components/MessageBox.vue'

const route = useRoute()
const isAdminRoute = computed(() => route.path.startsWith('/admin'))
</script>

<template>
    <Navbar v-if="!isAdminRoute" />
    <router-view />
    <MessageBox />
</template>
