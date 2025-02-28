import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
const supabase = createClient(
  process.env.SUPABASE_PROJECT_URL,
  process.env.SUPABASE_ANOE_KEY,
  {
    auth: {
      persistSession: false
    }
  }
)

async function uploadFile(filePath) {
  const fileName = path.basename(filePath)
  const file = await fs.promises.readFile(filePath)
  const { data, error } = await supabase.storage
    .from('client-releases')
    .upload(`${process.env.GITHUB_REF_NAME}/${fileName}`, file, {
      cacheControl: '3600',
      upsert: true
    })

  if (error) {
    throw error
  }
  return data
}

async function uploadFiles() {
  const distPath = path.join(process.cwd(), 'dist')
  const files = await fs.promises.readdir(distPath)

  for (const file of files) {
    if (
      file.endsWith('.exe') ||
      file.endsWith('.dmg') ||
      file.endsWith('.mjs') ||
      file.endsWith('.zip')
    ) {
      const filePath = path.join(distPath, file)
      console.log(`Uploading ${file}...`)
      await uploadFile(filePath)
      console.log(`Successfully uploaded ${file}`)
    }
  }
}

uploadFiles().catch(console.error)
