const express = require("express");
const router = express.Router();
const Controller = require("../controller/Controller");
const multer = require("multer");

// file upload
var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "downloads")
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + '.mp4')
    }
});

var upload = multer({ storage: storage });

// Admin: Create IPFS instance, and Orbit DB
router.post("/admin/createDB", Controller.CreateDBs);

// Admin: Get all users
router.get("/admin/getAllUsers", Controller.getAllUsers)

// User Register
router.post("/users/register", Controller.userRegister);

// User Login
router.post("/users/login", Controller.userLogin);

// Set user status (Active and ban)
router.post("/users/set/userStatus", Controller.changeUserStatus);

// Set user's content status (Active and ban)
router.post("/users/set/content/ChangeStatus", Controller.changeContentStatus);

// Upload Content
router.post("/users/content/uploadContent", Controller.uploadContent)

// Get Uploaded Content by Email
router.post("/users/get/UploadedContent", Controller.GetUploadedContent);

// Get Uploaded Content by Email
router.post("/users/getAll/UploadedContent", Controller.GetAllUploadedContent);

// Upload Videos
router.post("/upload/generate-ipfs", upload.single('video'), Controller.generateIPFS);

// Upload Profile Photo
router.post("/upload/photo", upload.single("photo"), Controller.uploadPhoto)

module.exports = router;