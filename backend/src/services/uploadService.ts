import { Readable } from 'stream'
import mongoose from 'mongoose'

const FILE_BUCKET = 'lotushack_uploads'

export interface UploadedFile {
  id: string
  filename: string
  contentType: string
  size: number
  uploadDate: Date
}

class UploadService {
  private bucket: mongoose.mongo.GridFSBucket | null = null

  private getBucket(): mongoose.mongo.GridFSBucket {
    if (!this.bucket) {
      const db = mongoose.connection.db
      if (!db) {
        throw new Error('MongoDB connection not initialized')
      }
      this.bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: FILE_BUCKET })
    }
    return this.bucket
  }

  async uploadFile(
    buffer: Buffer,
    filename: string,
    contentType: string
  ): Promise<UploadedFile> {
          const uploadStream = this.getBucket().openUploadStream(filename, {
      contentType,
      metadata: { uploadDate: new Date() },
    })

    const readable = Readable.from(buffer)

    return new Promise((resolve, reject) => {
      readable
        .pipe(uploadStream)
        .on('finish', () => {
          resolve({
            id: uploadStream.id.toString(),
            filename,
            contentType,
            size: buffer.length,
            uploadDate: new Date(),
          })
        })
        .on('error', reject)
    })
  }

  async getFile(fileId: string): Promise<{
    stream: mongoose.mongo.GridFSBucketReadStream
    filename: string
    contentType: string
    size: number
  } | null> {
    const objectId = new mongoose.Types.ObjectId(fileId)
    const files = await this.getBucket().find({ _id: objectId }).toArray()

    if (files.length === 0) return null

    const file = files[0]
    const stream = this.getBucket().openDownloadStream(objectId)

    return {
      stream,
      filename: file.filename,
      contentType: file.contentType || 'application/octet-stream',
      size: file.length,
    }
  }

  async deleteFile(fileId: string): Promise<boolean> {
    try {
      const objectId = new mongoose.Types.ObjectId(fileId)
      await this.getBucket().delete(objectId)
      return true
    } catch {
      return false
    }
  }
}

export const uploadService = new UploadService()
