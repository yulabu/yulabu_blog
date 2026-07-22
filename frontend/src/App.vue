<script setup lang="ts">
import Navbar from '@/components/Navbar.vue'
import MessageBox from '@/components/MessageBox.vue'
</script>

<template>
    <Navbar />
    <router-view />
    <MessageBox />
</template>
