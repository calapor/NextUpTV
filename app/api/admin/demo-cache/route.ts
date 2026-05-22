import { NextRequest } from 'next/server'
import { readFile, writeFile } from 'fs/promises'
import path from 'path'

const RECS_PATH = path.join(process.cwd(), 'lib/test-data/demo-recommendations.json')
const LIB_PATH = path.join(process.cwd(), 'lib/test-data/demo-library.json')

export async function GET() {
  try {
    const [recsRaw, libRaw] = await Promise.all([
      readFile(RECS_PATH, 'utf8'),
      readFile(LIB_PATH, 'utf8'),
    ])
    return Response.json({
      recsCount: JSON.parse(recsRaw).length,
      libCount: JSON.parse(libRaw).length,
    })
  } catch {
    return Response.json({ recsCount: 0, libCount: 0 })
  }
}

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return Response.json(
      { error: 'Regeneration is only available in local development' },
      { status: 403 }
    )
  }
  const { recommendations, libraryShows } = await req.json()
  await Promise.all([
    writeFile(RECS_PATH, JSON.stringify(recommendations, null, 2) + '\n'),
    writeFile(LIB_PATH, JSON.stringify(libraryShows, null, 2) + '\n'),
  ])
  return Response.json({ ok: true })
}
