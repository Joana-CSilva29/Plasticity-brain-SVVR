const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Storage configuration for VTP files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname) !== '.vtp') {
      return cb(new Error('Only VTP files are allowed'));
    }
    cb(null, true);
  }
});

// Routes
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  res.json({ 
    filename: req.file.filename,
    originalName: req.file.originalname,
    path: `/files/${req.file.filename}`
  });
});

app.get('/api/files', (req, res) => {
  const fs = require('fs');
  fs.readdir('uploads/', (err, files) => {
    if (err) {
      return res.status(500).json({ error: 'Error reading files' });
    }
    res.json(files.filter(file => path.extname(file) === '.vtp'));
  });
});

// Serve VTP files
app.use('/files', express.static('uploads', {
  maxAge: '1h',
  etag: true,
  lastModified: true
}));

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 