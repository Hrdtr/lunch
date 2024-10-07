<script setup lang="ts">
// import imageCompression from 'browser-image-compression'

const props = defineProps<{
  index: number
  edit?: Item
}>()
const emit = defineEmits<{
  cancel: []
  created: [data: Item]
  updated: [data: Item]
}>()

const {
  functions,
  id,
  storage,
} = useAppwrite()

const inputLaunchURL = useTemplateRef('inputLaunchURLRef')
onMounted(() => {
  /* Workaround to open keyboard for iOS Safari */
  const tmp = document.createElement('input')
  tmp.type = 'url'
  tmp.style.position = 'absolute'
  tmp.style.top = `${0}px`
  tmp.style.left = `${0}px`
  tmp.style.height = '0'
  tmp.style.opacity = '0'
  document.body.appendChild(tmp)
  tmp.focus()

  setTimeout(() => {
    inputLaunchURL.value?.focus()
    inputLaunchURL.value?.click()

    document.body.removeChild(tmp)
  }, 500)
})

const {
  databases,
} = useAppwrite()
const tg = useTgContext()

const icon = ref('')
const iconFile = ref<File | null>(null)
const launchURL = ref('')
const label = ref('')

onMounted(async () => {
  if (props.edit) {
    label.value = props.edit.label
    launchURL.value = props.edit.launchURL
    if (props.edit.icon) {
      const file = await fetchImageAsFile(storage.getFileDownload('default', props.edit.icon))
      if (file) {
        iconFile.value = file /* await imageCompression(file, {
          maxSizeMB: 2,
          maxWidthOrHeight: 512,
          preserveExif: true,
          useWebWorker: true,
        }) */
        icon.value = URL.createObjectURL(iconFile.value)
      }
    }
  }
})

const {
  open,
  onChange,
} = useFileDialog()
onChange(async (files) => {
  if (!files?.[0])
    return

  iconFile.value = files[0] /* await imageCompression(files[0], {
    maxSizeMB: 2,
    maxWidthOrHeight: 512,
    preserveExif: true,
    useWebWorker: true,
  }) */
  icon.value = URL.createObjectURL(iconFile.value)
})

const launchURLValid = computed(() => {
  try {
    const url = new URL(launchURL.value)
    return !!url
  }
  catch {
    return false
  }
})

const checkLaunchURLPending = ref(false)
const lastCheckedLaunchURL = ref('')

function getGreatestQualityIcon(data: {
  favicons: {
    rel: string
    type: string
    href: string
    sizes?: string
  }[]
}): string | undefined {
  function parseSize(size: string | undefined): number {
    if (!size)
      return 0

    const [width, height] = size.split('x').map(Number)
    return Math.max(width, height) || 0 // Return the largest dimension
  }

  const isSvg = (favicon: { type?: string }) => favicon.type === 'image/svg+xml'
  return data.favicons
    .sort((a, b) => {
      const sizeA = parseSize(a.sizes)
      const sizeB = parseSize(b.sizes)
      // Prefer SVG over others, and then larger sizes
      if (isSvg(a) && !isSvg(b))
        return -1
      if (!isSvg(a) && isSvg(b))
        return 1

      return sizeB - sizeA
    })[0]
    ?.href
}

async function checkLaunchURL() {
  if (checkLaunchURLPending.value || !launchURLValid.value)
    return

  checkLaunchURLPending.value = true
  functions.createExecution('fetch-web-metadata', undefined, false, `/?url=${launchURL.value}`)
    .then(async ({ responseBody }) => {
      try {
        const result = JSON.parse(responseBody)
        if (result.error) {
          toast.error(result.error)
          return
        }

        label.value = result.title || ''

        let iconURL = launchURL.value.includes('://t.me/')
          ? result['og:image'] || result['twitter:image'] || getGreatestQualityIcon(result) || ''
          : getGreatestQualityIcon(result) || ''
        if (iconURL.length > 0) {
          if (!iconURL.startsWith('http')) {
            iconURL = `${launchURL.value}${iconURL}`
          }

          const file = await fetchImageAsFile(iconURL)
          if (file) {
            iconFile.value = file /* await imageCompression(file, {
              maxSizeMB: 2,
              maxWidthOrHeight: 512,
              preserveExif: true,
              useWebWorker: true,
            }) */
            icon.value = URL.createObjectURL(iconFile.value)
          }
        }

        lastCheckedLaunchURL.value = launchURL.value
        checkLaunchURLPending.value = false
      }
      catch (e) {
        console.error(e)
        checkLaunchURLPending.value = false
        toast.error('Failed to fetch web metadata')
      }
    })
}

async function submit() {
  if (!tg?.launchParams.initData?.user?.id)
    return

  const promise = toast.promise('Saving...')
  if (!props.edit) {
    try {
      const iconResponse = iconFile.value
        ? await storage.createFile('default', id.unique(), iconFile.value)
        : undefined

      const response = await databases.createDocument('default', 'items', id.unique(), {
        uid: String(tg.launchParams.initData.user.id),
        icon: iconResponse?.$id ?? null,
        label: label.value,
        launchURL: launchURL.value,
        index: props.index,
      })

      promise.resolve('Item has been saved')
      emit('created', response as unknown as Item)
    }
    catch (error) {
      promise.reject(
        error instanceof Error
          ? error.message
          : 'An unknown error occurred while saving the item',
      )
    }
  }
  else {
    let newIconId: string | null = null
    try {
      const iconResponse = iconFile.value
        ? await storage.createFile('default', id.unique(), iconFile.value)
        : undefined
      if (iconResponse) {
        newIconId = iconResponse.$id
      }

      const response = await databases.updateDocument('default', 'items', props.edit.$id, {
        uid: String(tg.launchParams.initData.user.id),
        icon: iconResponse?.$id ?? null,
        label: label.value,
        launchURL: launchURL.value,
        index: props.index,
      })

      if (props.edit.icon) {
        await storage.deleteFile('default', props.edit.icon)
      }

      promise.resolve('Item has been updated')
      emit('updated', response as unknown as Item)
    }
    catch (error) {
      if (newIconId) {
        await storage.deleteFile('default', newIconId)
      }
      promise.reject(
        error instanceof Error
          ? error.message
          : 'An unknown error occurred while saving the item',
      )
    }
  }
}
</script>

<template>
  <form class="w-full h-full flex flex-col" @submit.prevent="submit">
    <div class="flex-1 flex flex-row gap-4 px-4">
      <div class="flex-shrink-0 w-1/3">
        <div
          class="aspect-square bg-neutral-200/65 dark:bg-neutral-800/65 border border-neutral-200 dark:border-neutral-800 rounded-2xl flex items-center justify-center"
          @click="() => {
            if (!checkLaunchURLPending) {
              open({ accept: 'image/*', multiple: false })
            }
          }"
        >
          <svg
            v-if="!icon"
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="lucide lucide-image-up w-12 h-12 opacity-50"
          ><path d="M10.3 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10l-3.1-3.1a2 2 0 0 0-2.814.014L6 21" /><path d="m14 19.5 3-3 3 3" /><path d="M17 22v-5.5" /><circle cx="9" cy="9" r="2" /></svg>
          <img v-else :src="icon" class="w-full h-full object-cover object-center rounded-2xl">
        </div>
      </div>

      <div class="w-full flex flex-col -space-y-px">
        <div class="relative">
          <input
            id="launch-url"
            ref="inputLaunchURLRef"
            v-model="launchURL"
            type="url"
            class="w-full bg-neutral-200/65 dark:bg-neutral-800/65 border border-neutral-200 dark:border-neutral-800 transition-colors rounded-xl px-4 py-2 rounded-b-none text-sm"
            :class="!props.edit && launchURLValid && lastCheckedLaunchURL !== launchURL ? 'pr-16' : ''"
            placeholder="Launch URL"
            required
          >
          <button
            v-if="!props.edit && launchURLValid && lastCheckedLaunchURL !== launchURL"
            type="button"
            class="absolute right-4 top-1/2 -translate-y-1/2 text-blue-500 disabled:opacity-50 text-sm"
            :disabled="checkLaunchURLPending"
            @click="checkLaunchURL"
          >
            <svg
              v-if="checkLaunchURLPending"
              class="animate-spin h-4 w-4 text-blue-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span v-else>Check</span>
          </button>
        </div>

        <input
          id="label"
          v-model="label"
          class="bg-neutral-200/65 dark:bg-neutral-800/65 border border-neutral-200 dark:border-neutral-800 transition-colors rounded-xl px-4 py-2 rounded-t-none text-sm"
          placeholder="Label"
          required
          :disabled="checkLaunchURLPending"
        >
      </div>
    </div>

    <div class="flex flex-row justify-end gap-2 sticky bottom-0 bg-neutral-100 dark:bg-neutral-900 p-4">
      <button
        type="button"
        class="rounded-xl px-4 py-2 bg-transparent hover:bg-neutral-200 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 transition-colors"
        :disabled="checkLaunchURLPending"
        @click="emit('cancel')"
      >
        Cancel
      </button>
      <button
        class="rounded-xl px-4 py-2 bg-neutral-200/65 dark:bg-neutral-800/65 hover:bg-neutral-200 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 transition-colors"
        :disabled="checkLaunchURLPending"
      >
        Submit
      </button>
    </div>
  </form>
</template>
