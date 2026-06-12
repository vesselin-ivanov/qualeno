import fs from 'node:fs/promises'
import path from 'node:path'

const source = path.resolve('dist')
const target = path.resolve('api/dist')

await fs.rm(target, { recursive: true, force: true })
await fs.cp(source, target, { recursive: true })
await fs.rm(source, { recursive: true, force: true })
