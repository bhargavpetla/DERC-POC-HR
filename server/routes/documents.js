const express = require('express');
const multer = require('multer');
const path = require('path');
const Document = require('../models/Document');
const authMiddleware = require('../middleware/auth');
const { rbacMiddleware, hrOnly } = require('../middleware/rbac');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'documents')),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

// GET /api/documents
router.get('/', authMiddleware, rbacMiddleware, async (req, res) => {
  try {
    let filter = {};
    const { type, department, region } = req.query;

    if (req.accessScope === 'self') {
      filter.$or = [
        { taggedEmployees: req.accessEmployeeCode },
        { accessLevel: 'organization' },
      ];
    } else if (req.accessScope === 'department') {
      filter.$or = [
        { taggedDepartments: req.accessDepartment },
        { department: req.accessDepartment },
        { accessLevel: 'organization' },
      ];
    }

    if (type) filter.type = type;
    if (department && req.accessScope === 'all') filter.department = department;
    if (region) filter.region = region;

    const documents = await Document.find(filter).sort({ uploadDate: -1 });
    res.json(documents);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/documents/:id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Document not found' });
    res.json(doc);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/documents
router.post('/', authMiddleware, hrOnly, upload.single('file'), async (req, res) => {
  try {
    const docData = {
      title: req.body.title,
      type: req.body.type,
      customType: req.body.customType || '',
      department: req.body.department,
      region: req.body.region,
      taggedEmployees: req.body.taggedEmployees ? JSON.parse(req.body.taggedEmployees) : [],
      taggedDepartments: req.body.taggedDepartments ? JSON.parse(req.body.taggedDepartments) : [],
      tags: req.body.tags ? JSON.parse(req.body.tags) : [],
      uploadedBy: req.user.employeeCode,
      accessLevel: req.body.accessLevel || 'employee',
      description: req.body.description,
      fileUrl: req.file ? `/api/documents/file/${req.file.filename}` : '',
      fileName: req.file ? req.file.originalname : '',
      fileSize: req.file ? req.file.size : 0,
    };

    const document = await Document.create(docData);
    res.status(201).json(document);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/documents/file/:filename
router.get('/file/:filename', (req, res) => {
  const filePath = path.join(__dirname, '..', 'documents', req.params.filename);
  res.sendFile(filePath);
});

// DELETE /api/documents/:id
router.delete('/:id', authMiddleware, hrOnly, async (req, res) => {
  try {
    await Document.findByIdAndDelete(req.params.id);
    res.json({ message: 'Document deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
