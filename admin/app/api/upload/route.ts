import { NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Configure Cloudinary from environment variables only
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
})

export async function POST(req: Request) {
  try {
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return NextResponse.json(
        { ok: false, error: 'Cloudinary environment variables (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) are missing from configuration.' },
        { status: 500 }
      )
    }

    const contentType = req.headers.get('content-type') || ''

    let dataUri = ''

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      const file = formData.get('file') as File | null
      if (!file) {
        return NextResponse.json({ ok: false, error: 'No file provided' }, { status: 400 })
      }

      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const base64 = buffer.toString('base64')
      dataUri = `data:${file.type || 'image/png'};base64,${base64}`
    } else {
      const body = await req.json()
      dataUri = body.image || body.file || ''
      if (!dataUri) {
        return NextResponse.json({ ok: false, error: 'No image data provided' }, { status: 400 })
      }
    }

    // Upload and automatically compress into optimized WebP format
    const uploadRes = await cloudinary.uploader.upload(dataUri, {
      folder: 'valanchery_festival/gifts',
      resource_type: 'image',
      format: 'webp',
      transformation: [
        { width: 1200, height: 1200, crop: 'limit', quality: 'auto:good', fetch_format: 'webp' },
      ],
    })

    return NextResponse.json({
      ok: true,
      url: uploadRes.secure_url,
      publicId: uploadRes.public_id,
    })
  } catch (error: any) {
    console.error('Cloudinary upload error:', error)
    return NextResponse.json(
      { ok: false, error: error.message || 'Image upload failed' },
      { status: 500 }
    )
  }
}
