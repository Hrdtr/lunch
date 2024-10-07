<script setup lang="ts">
import {
  autoUpdate,
  flip,
  offset,
  shift,
  useFloating,
} from '@floating-ui/vue'
import { openLink, openTelegramLink } from '@telegram-apps/sdk'

const props = defineProps<{
  data: Item
  disabled?: boolean
}>()

const emit = defineEmits<{
  removed: []
  updated: [data: Item]
}>()

const {
  databases,
  storage,
} = useAppwrite()

const element = useTemplateRef('elementRef')
const originalWidth = ref(0)
onMounted(() => setTimeout(() => {
  originalWidth.value = element.value?.offsetWidth ?? 0
}, 100))

const floating = useTemplateRef('floatingRef')
const floatingShown = ref(false)
const floatingShownDebounced = debouncedRef(floatingShown)
onClickOutside(computed(() => floatingShown.value ? floating.value : null), () => {
  floatingShown.value = false
})

const {
  isPositioned: floatingPositionReady,
  floatingStyles,
} = useFloating(element, floating, {
  whileElementsMounted: autoUpdate,
  open: floatingShown,
  placement: 'bottom-start',
  middleware: [
    flip(),
    offset(8),
    shift(),
  ],
})

const scale = ref(1)
const scaleUpTimeout = ref<number>()
const delayedPointerDown = ref(false)

watch(floatingShown, (value) => {
  scale.value = value ? 1.1 : 1
  if (delayedPointerDown.value) {
    delayedPointerDown.value = false
  }
})
onLongPress(element, () => {
  if (props.disabled)
    return

  haptic.impact('medium')
  floatingShown.value = true
}, {
  delay: 750,
  modifiers: {
    prevent: true,
  },
})

function pointerDownHandler() {
  scale.value = 0.95
  setTimeout(() => {
    delayedPointerDown.value = true
    scale.value = 1
  }, 200)
}

function pointerUpHandler() {
  delayedPointerDown.value = false
  if (scaleUpTimeout.value) {
    clearTimeout(scaleUpTimeout.value)
    scale.value = 1
  }

  if (!floatingShown.value && !props.disabled) {
    haptic.impact('medium')
    if (props.data.launchURL.includes('://t.me/')) {
      openTelegramLink(props.data.launchURL)
    }
    else {
      openLink(props.data.launchURL)
    }
  }
}

onBeforeUnmount(() => {
  if (scaleUpTimeout.value) {
    clearTimeout(scaleUpTimeout.value)
  }
})

async function remove() {
  if (!props.data)
    return

  const promise = toast.promise('Removing...')
  try {
    const promises = [databases.deleteDocument('default', 'items', props.data.$id)]
    if (props.data.icon) {
      promises.push(storage.deleteFile('default', props.data.icon))
    }
    await Promise.all(promises)
    promise.resolve('Item has been removed')
    emit('removed')
  }
  catch (error) {
    promise.reject(
      error instanceof Error
        ? error.message
        : 'An unknown error occurred while remove the item',
    )
  }
}

const bottomSheetOpen = ref(false)
</script>

<template>
  <div
    ref="elementRef"
    class="flex flex-col transition-transform"
    :class="[delayedPointerDown ? 'duration-700 ease-in-out' : '', disabled ? '' : 'cursor-pointer']"
    :style="{
      transform: `scale(${scale})`,
      ...(floatingShown ? { position: 'sticky', width: `${originalWidth}px`, zIndex: 9999 } : {}),
    }"
    @pointerdown="pointerDownHandler"
    @pointerup="pointerUpHandler"
  >
    <div class="w-full h-full rounded-xl bg-neutral-200/50 dark:bg-neutral-800/50 aspect-square">
      <img v-if="props.data?.icon" :src="storage.getFilePreview('default', props.data.icon, 240, 240)" class="w-full h-full object-cover object-center rounded-xl">
      <div v-else class="w-full h-full flex items-center justify-center">
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
          class="lucide lucide-layout-grid w-10 h-10 opacity-50"
        ><rect
          width="7"
          height="7"
          x="3"
          y="3"
          rx="1"
        /><rect
          width="7"
          height="7"
          x="14"
          y="3"
          rx="1"
        /><rect
          width="7"
          height="7"
          x="14"
          y="14"
          rx="1"
        /><rect
          width="7"
          height="7"
          x="3"
          y="14"
          rx="1"
        /></svg>
      </div>
    </div>
    <span class="text-sm truncate mt-0.5 mx-px transition-all" :class="floatingShownDebounced ? 'ml-4' : ''">{{ props.data?.label ?? 'Unlabeled' }}</span>
  </div>

  <Teleport v-if="!props.disabled" to="body">
    <Transition
      enter-active-class="transition"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="floatingShown"
        class="absolute inset-0 backdrop-blur-md duration-300"
        :style="{ zIndex: 9998 }"
      />
    </Transition>

    <div
      v-if="floatingShown || floatingShownDebounced"
      ref="floatingRef"
      :style="[{ ...floatingStyles }, { zIndex: 9999 }]"
    >
      <div
        class="w-52 transition ease-in bg-neutral-100 dark:bg-neutral-900 rounded-xl overflow-hidden [&_li:first-child_>_a]:rounded-t-xl [&_li:last-child_>_a]:rounded-b-xl"
        :class="floatingPositionReady ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'"
      >
        <ul class="flex flex-col divide-y divide-neutral-200 dark:divide-neutral-800">
          <li>
            <a
              href="#"
              class="inline-flex items-center gap-4 w-full px-4 py-2 transition-colors hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50"
              @click.prevent="bottomSheetOpen = true"
            >
              <span class="truncate">Edit</span>
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
                class="lucide lucide-pencil w-4 h-4 ml-auto"
              >
                <path
                  d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"
                />
                <path d="m15 5 4 4" />
              </svg>
            </a>
          </li>

          <li>
            <a
              href="#"
              class="inline-flex items-center gap-4 w-full px-4 py-2 transition-colors hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 text-red-500"
              @click.prevent="remove"
            >
              <span class="truncate">Remove</span>
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
                class="lucide lucide-eraser w-4 h-4 ml-auto"
              >
                <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" />
                <path d="M22 21H7" />
                <path d="m5 11 9 9" />
              </svg>
            </a>
          </li>
        </ul>
      </div>
    </div>
  </Teleport>

  <BottomSheet v-if="!props.disabled" v-model:open="bottomSheetOpen" title="Edit Item">
    <ItemForm
      :index="props.data.index"
      :edit="props.data"
      @cancel="bottomSheetOpen = false"
      @updated="(data) => {
        bottomSheetOpen = false
        emit('updated', data)
      }"
    />
  </BottomSheet>
</template>
