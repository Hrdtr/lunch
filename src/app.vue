<script setup lang="ts">
import { Notification, Notivue } from 'notivue'
import VirtualList from 'vue-virtual-draglist'

const scrollContainer = useTemplateRef<HTMLDivElement>('scrollContainerRef')
const searchVisible = ref(false)

const {
  databases,
  q,
} = useAppwrite()
const tg = useTgContext()

const itemsLoading = ref(true)
const items = ref<Item[]>([])

const column1 = ref<(Item & { key: string })[]>([])
const column2 = ref<(Item & { key: string })[]>([])
const column3 = ref<(Item & { key: string })[]>([])
const column4 = ref<(Item & { key: string })[]>([])

const mounted = useMounted()
const skipInitializeColumns = ref(false)

watchDebounced(
  () => [
    column1.value.length,
    column2.value.length,
    column3.value.length,
    column4.value.length,
  ],
  (columnLengths) => {
    if (!mounted.value || skipInitializeColumns.value)
      return

    skipInitializeColumns.value = true

    const updatedItems: (Item | null)[] = []
    for (let i = 0; i < Math.max(...columnLengths); i++) {
      [column1.value, column2.value, column3.value, column4.value].forEach((value) => {
        if (value[i]) {
          const { key, ...rest } = value[i]
          const emptyIndex = updatedItems.indexOf(null)
          if (emptyIndex > -1) {
            updatedItems[emptyIndex] = rest
          }
          else {
            updatedItems.push(rest)
          }
        }
        else {
          updatedItems.push(null)
        }
      })
    }

    items.value = updatedItems.filter(item => item !== null).map((item, index) => ({
      ...item,
      index,
    }))

    nextTick(() => {
      initializeColumns()
      skipInitializeColumns.value = false
    })
  },
  { debounce: 200, deep: true },
)

function resetColumns() {
  column1.value = []
  column2.value = []
  column3.value = []
  column4.value = []
}

function initializeColumns() {
  if (!items.value)
    return

  const columns: (Item & { key: string, index: number })[][] = [[], [], [], []]
  items.value.forEach((item, index) => {
    const columnIndex = index % 4 // Calculate which column this item goes to
    columns[columnIndex].push({ ...item, key: String(item.$id), index })
  })

  resetColumns()
  column1.value = columns[0]
  column2.value = columns[1]
  column3.value = columns[2]
  column4.value = columns[3]
}

onMounted(async () => {
  if (!tg?.launchParams.initData?.user?.id)
    return

  try {
    const response = await databases.listDocuments('default', 'items', [q.equal('uid', String(tg.launchParams.initData.user.id))])
    items.value = (response.documents as unknown as Item[]).sort((a, b) => a.index - b.index)
    initializeColumns()
    itemsLoading.value = false
  }
  catch (error) {
    toast.error(
      error instanceof Error
        ? error.message
        : 'An unknown error occurred while loading the items',
    )
  }
})
watch(items, () => {
  if (skipInitializeColumns.value)
    return

  initializeColumns()
}, { deep: true })

const initialItemsBeforeSorting = ref<Item[]>()
const itemsToBeUpdated = computed(() => {
  if (!initialItemsBeforeSorting.value)
    return []

  const updatedItems = items.value.filter(item => item !== null).filter((item) => {
    const initialItem = initialItemsBeforeSorting.value?.find(initialItem => initialItem.$id === item.$id)
    return initialItem && initialItem.index !== item.index
  }) ?? []

  return updatedItems
})
const sorting = ref(false)
watch(sorting, (value) => {
  haptic.impact('medium')
  if (value) {
    initialItemsBeforeSorting.value = items.value
  }
  else {
    if (itemsToBeUpdated.value.length > 0) {
      Promise.all(itemsToBeUpdated.value.map(item => databases.updateDocument('default', 'items', item.$id, { index: item.index })))
        .then(() => {
          initialItemsBeforeSorting.value = undefined
        })
    }
    else {
      initialItemsBeforeSorting.value = undefined
    }
  }
})

const bottomSheetOpen = ref(false)
</script>

<template>
  <div
    id="scroll-container"
    ref="scrollContainerRef"
    class="w-full h-[var(--tg-viewport-height,100dvh)] flex flex-col relative overflow-y-auto"
  >
    <div v-if="itemsLoading" class="w-full h-full flex flex-col items-center justify-center">
      <svg
        class="animate-spin h-6 w-6"
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
    </div>

    <main v-else class="flex-1 w-full max-w-[575px] mx-auto flex flex-col">
      <div
        class="flex-1 grid grid-cols-4 gap-6 px-4 pb-32 transition-all"
        :class="searchVisible ? 'pt-20' : 'pt-6'"
      >
        <VirtualList
          v-model="column1"
          data-key="key"
          group="group"
          handle=".drag-handle"
          :disabled="!sorting"
          :scroller="scrollContainer ?? undefined"
        >
          <template #item="{ record/*  index, dataKey */ }">
            <div class="mb-6" :class="sorting ? 'animate-jiggle cursor-move relative' : ''">
              <Item
                :data="record"
                :disabled="sorting"
                @removed="items = items.filter(item => item.$id !== record.$id)"
                @updated="items = items.map(item => item.$id === record.$id ? $event : item)"
              />
              <div v-if="sorting" class="drag-handle absolute inset-0" />
            </div>
          </template>
        </VirtualList>

        <VirtualList
          v-model="column2"
          data-key="key"
          group="group"
          handle=".drag-handle"
          :disabled="!sorting"
          :scroller="scrollContainer ?? undefined"
        >
          <template #item="{ record/*  index, dataKey */ }">
            <div class="mb-6" :class="sorting ? 'animate-jiggle cursor-move relative' : ''">
              <Item
                :data="record"
                :disabled="sorting"
                @removed="items = items.filter(item => item.$id !== record.$id)"
                @updated="items = items.map(item => item.$id === record.$id ? $event : item)"
              />
              <div v-if="sorting" class="drag-handle absolute inset-0" />
            </div>
          </template>
        </VirtualList>

        <VirtualList
          v-model="column3"
          data-key="key"
          group="group"
          handle=".drag-handle"
          :disabled="!sorting"
          :scroller="scrollContainer ?? undefined"
        >
          <template #item="{ record/*  index, dataKey */ }">
            <div class="mb-6" :class="sorting ? 'animate-jiggle cursor-move relative' : ''">
              <Item
                :data="record"
                :disabled="sorting"
                @removed="items = items.filter(item => item.$id !== record.$id)"
                @updated="items = items.map(item => item.$id === record.$id ? $event : item)"
              />
              <div v-if="sorting" class="drag-handle absolute inset-0" />
            </div>
          </template>
        </VirtualList>

        <VirtualList
          v-model="column4"
          data-key="key"
          group="group"
          handle=".drag-handle"
          :disabled="!sorting"
          :scroller="scrollContainer ?? undefined"
        >
          <template #item="{ record/*  index, dataKey */ }">
            <div class="mb-6" :class="sorting ? 'animate-jiggle cursor-move relative' : ''">
              <Item
                :data="record"
                :disabled="sorting"
                @removed="items = items.filter(item => item.$id !== record.$id)"
                @updated="items = items.map(item => item.$id === record.$id ? $event : item)"
              />
              <div v-if="sorting" class="drag-handle absolute inset-0" />
            </div>
          </template>
        </VirtualList>
      </div>

      <div
        class="w-full max-w-[575px] flex flex-row gap-2 bg-neutral-100 dark:bg-neutral-900 border border-b-0 border-neutral-200 dark:border-neutral-800 rounded-t-3xl px-4 pt-4 pb-6 h-auto transition-all duration-300 overflow-hidden"
        :class="searchVisible ? 'fixed top-0 border-r-0 border-l-0' : 'sticky bottom-0'"
      >
        <input
          class="flex-1 bg-neutral-200/65 dark:bg-neutral-800/65 border border-neutral-200 dark:border-neutral-800 transition-colors rounded-xl px-4 py-2 text-sm"
          placeholder="Search..."
          @focus="searchVisible = true"
          @blur="searchVisible = false"
        >

        <button
          :class="searchVisible ? 'overflow-hidden' : 'overflow-y-auto'"
          class="rounded-xl px-2 bg-neutral-200/65 dark:bg-neutral-800/65 hover:bg-neutral-200 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 transition-colors"
          @click="sorting = !sorting"
        >
          <svg
            v-if="!sorting"
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="lucide lucide-square-dashed-mouse-pointer w-5 h-5"
          >
            <path
              d="M12.034 12.681a.498.498 0 0 1 .647-.647l9 3.5a.5.5 0 0 1-.033.943l-3.444 1.068a1 1 0 0 0-.66.66l-1.067 3.443a.5.5 0 0 1-.943.033z"
            />
            <path d="M5 3a2 2 0 0 0-2 2" />
            <path d="M19 3a2 2 0 0 1 2 2" />
            <path d="M5 21a2 2 0 0 1-2-2" />
            <path d="M9 3h1" />
            <path d="M9 21h2" />
            <path d="M14 3h1" />
            <path d="M3 9v1" />
            <path d="M21 9v2" />
            <path d="M3 14v1" />
          </svg>

          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="lucide lucide-check w-5 h-5"
          ><path d="M20 6 9 17l-5-5" /></svg>
        </button>

        <button
          class="rounded-xl px-2 bg-neutral-200/65 dark:bg-neutral-800/65 hover:bg-neutral-200 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 transition-colors"
          @click="bottomSheetOpen = !bottomSheetOpen"
        >
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
            class="lucide lucide-plus w-5 h-5"
          ><path d="M5 12h14" /><path d="M12 5v14" /></svg>
        </button>
      </div>
    </main>
  </div>

  <BottomSheet v-model:open="bottomSheetOpen" title="New Item">
    <ItemForm
      :index="items.length"
      @created="(item) => {
        items = [...items, item].sort((a, b) => a.index - b.index)
        bottomSheetOpen = false
      }"
      @cancel="bottomSheetOpen = false"
    />
  </BottomSheet>

  <Notivue v-slot="item">
    <Notification :item="item" />
  </Notivue>
</template>

<style scoped>
</style>
