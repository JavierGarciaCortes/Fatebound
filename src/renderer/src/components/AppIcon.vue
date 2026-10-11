<script setup lang="ts">
defineProps<{
  name:
    | 'home'
    | 'worlds'
    | 'characters'
    | 'chronicles'
    | 'settings'
    | 'compass'
    | 'database'
    | 'shield'
    | 'refresh'
    | 'sparkles'
}>()
</script>

<template>
  <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <template v-if="name === 'home'">
      <path d="m3.5 10.6 8.5-7 8.5 7" />
      <path d="M5.5 9.4v10h13v-10M9.5 19.4v-6h5v6" />
    </template>
    <template v-else-if="name === 'worlds'">
      <circle cx="12" cy="12" r="8.5" />
      <path
        d="M3.8 12h16.4M12 3.5c2.3 2.3 3.5 5.1 3.5 8.5S14.3 18.2 12 20.5C9.7 18.2 8.5 15.4 8.5 12S9.7 5.8 12 3.5Z"
      />
    </template>
    <template v-else-if="name === 'characters'">
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5.5 20c.6-4 2.7-6.2 6.5-6.2s5.9 2.2 6.5 6.2" />
    </template>
    <template v-else-if="name === 'chronicles'">
      <path d="M5 4.5h11.5A2.5 2.5 0 0 1 19 7v12.5H7.5A2.5 2.5 0 0 1 5 17V4.5Z" />
      <path d="M5 17c0-1.4 1.1-2.5 2.5-2.5H19M9 8h6" />
    </template>
    <template v-else-if="name === 'settings'">
      <circle cx="12" cy="12" r="3" />
      <path
        d="M19.2 13.5a7.6 7.6 0 0 0 0-3l2-1.5-2-3.4-2.5 1a8 8 0 0 0-2.6-1.5L13.7 2H9.8l-.4 3.1a8 8 0 0 0-2.6 1.5l-2.5-1-2 3.4 2 1.5a7.6 7.6 0 0 0 0 3l-2 1.5 2 3.4 2.5-1a8 8 0 0 0 2.6 1.5l.4 3.1h3.9l.4-3.1a8 8 0 0 0 2.6-1.5l2.5 1 2-3.4-2-1.5Z"
      />
    </template>
    <template v-else-if="name === 'compass'">
      <circle cx="12" cy="12" r="9" />
      <path d="m15.8 8.2-2.1 5.5-5.5 2.1 2.1-5.5 5.5-2.1Z" />
    </template>
    <template v-else-if="name === 'database'">
      <ellipse cx="12" cy="5.5" rx="7.5" ry="3" />
      <path
        d="M4.5 5.5v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-6M4.5 11.5v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-6"
      />
    </template>
    <template v-else-if="name === 'shield'">
      <path d="M12 2.8 19 5v5.8c0 4.7-2.7 8.3-7 10.4-4.3-2.1-7-5.7-7-10.4V5l7-2.2Z" />
      <path d="m8.7 12 2.1 2.1 4.7-5" />
    </template>
    <template v-else-if="name === 'refresh'">
      <path d="M19 8V3.8l-1.8 1.8A8.5 8.5 0 1 0 20.3 14" />
      <path d="M19 3.8h-4.2" />
    </template>
    <template v-else>
      <path
        d="m12 2 1.2 5.1L18 5l-2.1 4.8L21 11l-5.1 1.2L18 17l-4.8-2.1L12 20l-1.2-5.1L6 17l2.1-4.8L3 11l5.1-1.2L6 5l4.8 2.1L12 2Z"
      />
    </template>
  </svg>
</template>

<style scoped>
svg {
  display: block;
  width: 1.25rem;
  height: 1.25rem;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.6;
}
</style>
