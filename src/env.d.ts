declare global {
  interface Item {
    $id: string
    uid: string
    icon?: string | null
    launchURL: string
    label: string
    index: number
  }
}

export {}
