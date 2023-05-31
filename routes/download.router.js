const express = require('express');
const router = express.Router();
const multer = require("multer");

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'v')
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + '.mp4')
  }
})
var upload = multer({ storage: storage })

const DownloadController = require('../controller/download.controller');
// const UserController = require("../controller/user.controller");

router.post('/generate-ipfs', upload.single('video'), DownloadController.generateIPFS);
router.get('/upload-video', DownloadController.uploadVideo);
router.post('/get-processing', DownloadController.getProcessing);
router.post('/get-histories', DownloadController.getHistories);
router.post('/check-upload-overflow', DownloadController.checkUploadOverflow);
router.post('/get-history-by-hash', DownloadController.getHistoryByHash);
router.post('/remove-history', DownloadController.removeHistory);
router.post('/confirm-email', DownloadController.confirmEmail);
router.post('/check-token', DownloadController.checkToken);

// router.post('/login', UserController.login);
// router.post('/restore', UserController.checkAuth);

// router.get('/preview', UserController.preview);
module.exports = router;
