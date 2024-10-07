export async function fetchImageAsFile(url: string, filename = 'image.jpg') {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Error fetching image: ${response.statusText}`)
    }

    const blob = await response.blob()
    const file = new File([blob], filename, { type: blob.type })

    return file
  }
  catch (error) {
    console.error('Failed to fetch image:', error)
    return null
  }
}
