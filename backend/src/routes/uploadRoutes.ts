import multer from 'multer'
import { Router } from 'express'
import { uploadCv, uploadFaceImage } from '../controllers/uploadController'

const router = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 12 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    cb(null, true)
  },
})

router.post('/cv', upload.single('file'), uploadCv)
router.post('/face-image', upload.single('file'), uploadFaceImage)

export default router
