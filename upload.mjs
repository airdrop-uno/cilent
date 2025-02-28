import oss from 'ali-oss'
import fs from 'fs'
import path from 'path'
import glob from 'glob'

const client = new oss({
  region: process.env.OSS_REGION,
  bucket: process.env.OSS_BUCKET,
  accessKeyId: process.env.OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET
})

async function uploadFile(filePath) {
  const fileName = path.basename(filePath)
  const file = await fs.promises.readFile(filePath)
  const { url } = await client.put(
    `releases/${process.env.GITHUB_REF_NAME}/${fileName}`,
    file
  )
  console.log(`Uploaded ${fileName} to ${url}`)
  return
}

async function uploadFiles() {
  const files = glob.sync('dist/*.{exe,zip,dmg,tar.gz}')

  // 并行上传所有文件
  await Promise.all(files.map(uploadFile))
}

uploadFiles().catch(console.error)
