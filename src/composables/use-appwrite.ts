import { Client, Databases, Functions, ID, Query, Storage } from 'appwrite'

export const useAppwrite = createSharedComposable(() => {
  const client = new Client()
  client.setEndpoint('https://cloud.appwrite.io/v1')
  client.setProject('lunch')

  return {
    client,
    databases: new Databases(client),
    functions: new Functions(client),
    id: ID,
    storage: new Storage(client),
    q: Query,
  }
})
