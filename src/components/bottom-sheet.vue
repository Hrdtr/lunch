<script setup lang="ts">
const props = defineProps<{
  title: string
}>()
const open = defineModel<boolean>('open')
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition delay-300"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="absolute inset-0 backdrop-blur-md duration-300"
        :style="{ zIndex: 9998 }"
        @click="open = false"
      />
    </Transition>

    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="translate-y-full"
      enter-to-class="translate-y-0"
      leave-active-class="transition duration-300"
      leave-from-class="translate-y-0"
      leave-to-class="translate-y-full"
    >
      <div v-if="open" class="absolute inset-0 top-auto w-full max-w-[575px] mx-auto h-[85%] z-50 flex items-center justify-center bg-neutral-100 dark:bg-neutral-900 border border-b-0 border-neutral-200 dark:border-neutral-800 rounded-t-3xl" :style="{ zIndex: 9999 }">
        <div class="w-full h-full flex flex-col relative overflow-hidden">
          <button class="absolute top-4 right-4 rounded-xl p-2 bg-neutral-200/65 dark:bg-neutral-800/65 hover:bg-neutral-200 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 transition-colors" @click="open = false">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="lucide lucide-x w-5 h-5"
            ><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
          </button>
          <h2 class="text-2xl px-4 py-5">
            {{ props.title }}
          </h2>

          <div class="flex-1 w-full h-full overflow-y-auto">
            <slot />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
