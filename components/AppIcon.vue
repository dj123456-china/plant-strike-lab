<template><image class="app-icon" :src="'/static/icons/' + name + '.png'" mode="aspectFit" aria-hidden="true" /></template>
<script setup>
defineProps({ name: { type: String, required: true } });
</script>
