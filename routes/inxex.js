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

var uploadVideo = multer({ storage: storage });

// photo upload
var photoStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "photos")
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + '.jpg');
    }
});

var uploadPhoto = multer({ storage: photoStorage });

// Thumbnail upload
var thumbnailStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "thumbnail")
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + '.jpg');
    }
});

var uploadThumbnail = multer({ storage: thumbnailStorage });


// Admin: Create IPFS instance, and Orbit DB
router.post("/admin/createDB", Controller.CreateDBs);

// Admin: Get all users
router.get("/admin/getAllUsers", Controller.getAllUsers);

// Get user Profile by email
router.post("/admin/getUsers", Controller.getUsersByEmail);

// User Register
router.post("/users/register", Controller.userRegister);

// User Login
router.post("/users/login", Controller.userLogin);

// Set user status (Active and ban)
router.post("/users/set/userStatus", Controller.changeUserStatus);

// Set user's content status (Active and ban)
router.post("/users/set/content/ChangeStatus", Controller.changeContentStatus);

// Upload Content
router.post("/users/content/uploadContent", Controller.uploadContent);

// Upload Content in Web
router.post("/users/content/web/uploadContent", uploadThumbnail.single('thumbnail'), Controller.Web_uploadContent);

// Get Uploaded Content by Email
router.post("/users/get/UploadedContent", Controller.GetUploadedContent);

// Get All Uploaded Content
router.post("/users/getAll/UploadedContent", Controller.GetAllUploadedContent);

// Upload Videos
router.post("/upload/generate-ipfs", uploadVideo.single('video'), Controller.generateIPFS);

// Upload Profile Photo
router.post("/upload/photo", uploadPhoto.single("photo"), Controller.uploadPhoto)

module.exports = router;