import { Request, Response } from 'express'
import { uploadService } from '../services/uploadService'
import { asyncHandler } from '../utils/asyncHandler'
import { BadRequestError } from '../utils/errors'

const ALLOWED_CV_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

const ALLOWED_FACE_TYPES = ['image/jpeg', 'image/png']

const MAX_CV_SIZE = 10 * 1024 * 1024
const MAX_FACE_SIZE = 5 * 1024 * 1024

function validateFile(
  file: Express.Multer.File | undefined,
  allowedTypes: string[],
  maxSize: number,
  fieldName: string
): void {
  if (!file) {
    throw new BadRequestError(`${fieldName} is required`)
  }

  if (!allowedTypes.includes(file.mimetype)) {
    throw new BadRequestError(`Invalid file type for ${fieldName}. Allowed: ${allowedTypes.join(', ')}`)
  }

  if (file.size > maxSize) {
    throw new BadRequestError(`File size for ${fieldName} exceeds the maximum allowed size`)
  }
}

export const uploadCv = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const file = req.file
    validateFile(file, ALLOWED_CV_TYPES, MAX_CV_SIZE, 'CV')

    const result = await uploadService.uploadFile(file!.buffer, file!.originalname, file!.mimetype)

    res.status(201).json({
      success: true,
      message: 'CV uploaded successfully',
      data: {
        id: result.id,
        filename: result.filename,
        contentType: result.contentType,
        size: result.size,
      },
    })
  }
)

export const uploadFaceImage = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const file = req.file
    validateFile(file, ALLOWED_FACE_TYPES, MAX_FACE_SIZE, 'Face image')

    const result = await uploadService.uploadFile(file!.buffer, file!.originalname, file!.mimetype)

    res.status(201).json({
      success: true,
      message: 'Face image uploaded successfully',
      data: {
        id: result.id,
        filename: result.filename,
        contentType: result.contentType,
        size: result.size,
      },
    })
  }
)
