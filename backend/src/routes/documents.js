const express = require('express');
const router = express.Router();
const { upload } = require('../middleware/upload');
const {
  uploadDocument,
  getDocument,
  getDocumentFile,
  listDocuments
} = require('../controllers/documentsController');

router.post('/upload', upload.single('file'), uploadDocument);
router.get('/', listDocuments);
router.get('/:id/file', getDocumentFile);
router.get('/:id', getDocument);

module.exports = router;
