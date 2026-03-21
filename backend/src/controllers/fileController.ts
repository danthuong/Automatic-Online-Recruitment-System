import { Request, Response } from 'express'
import { uploadService } from '../services/uploadService'
import { NotFoundError } from '../utils/errors'

export const getFile = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params

  const file = await uploadService.getFile(id)

  if (!file) {
    throw new NotFoundError('File not found')
  }

  res.setHeader('Content-Type', file.contentType)
  res.setHeader('Content-Length', file.size)
  res.setHeader('Content-Disposition', `inline; filename="${file.filename}"`)
  res.setHeader('Cache-Control', 'public, max-age=31536000')

  file.stream.pipe(res)
}
