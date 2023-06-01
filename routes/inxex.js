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

// Playlists photo upload
var playlistStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "playlists")
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + '.jpg');
    }
});
var uploadPlaylist = multer({ storage: playlistStorage });

// Admin: Create IPFS instance, and Orbit DB
router.post("/admin/createDB", Controller.CreateDBs);

// Admin: Get all users
router.get("/admin/getAllUsers", Controller.getAllUsers);

// Get user Profile by email
router.post("/admin/getUsers", Controller.getUsersByEmail);

// Remove user by admin
router.post("/admin/removeUser", Controller.removeUser);

// User Register
router.post("/users/register", Controller.userRegister);

// Edit user data
router.post("/users/edit", Controller.editUser)

// user reset-password
router.post("/users/reset-password", Controller.resetPassword);

// Verify Code
router.post("/users/verify-code", Controller.verifyCode);

// Set New Password
router.post("/users/set-new-password", Controller.setNewPassword);

// User Login
router.post("/users/login", Controller.userLogin);

// Set user status (Active and ban)
router.post("/users/set/userStatus", Controller.changeUserStatus);

// set follow user
router.post("/users/follow", Controller.followUser);

// set unfollow user
router.post("/users/unfollow", Controller.unfollowUser);

// Set user's content status (Active and ban)
router.post("/users/set/content/ChangeStatus", Controller.changeContentStatus);

// Upload Content
router.post("/users/content/uploadContent", Controller.uploadContent);

// Like Content
router.post("/users/content/like", Controller.likeContent);
router.post("/content/like", Controller.likeVideos);

// Dislike Content
router.post("/users/content/dislike", Controller.dislikeContent);
router.post("/content/dislike", Controller.dislikeVideos);

// Personalized feeds & algorithm
router.post("/users/personalize", Controller.personalized);

// Upload Content in Web
router.post("/users/content/web/uploadContent", uploadThumbnail.single('thumbnail'), Controller.Web_uploadContent);

// Get Uploaded Content by Email
router.post("/users/get/UploadedContent", Controller.GetUploadedContent);

// Get Uploaded Content by Category
router.post("/users/get/UploadedContent/Category", Controller.GetUploadedContentByCategory)

// Get All Uploaded Content
router.post("/users/getAll/UploadedContent", Controller.GetAllUploadedContent);

// Upload Videos
router.post("/upload/generate-ipfs", uploadVideo.single('video'), Controller.generateIPFS);

// Upload Profile Photo
router.post("/upload/photo", uploadPhoto.single("photo"), Controller.uploadPhoto);

// create channel
router.post("/create/channel", uploadPhoto.single("photo"), Controller.createChannel);

// get all channels
router.post("/getAll/channels", Controller.getAllChannels);

// get user channel
router.post("/get/channel", Controller.getChannelByUser);

// Follow channel api
router.post("/follow/channel", Controller.followChannel);

// unFollow channel api
router.post("/unFollow/channel", Controller.unFollowChannel);

// upload contents to channel
router.post("/uploadContents/channel", uploadThumbnail.single('thumbnail'), Controller.uploadContentsChannel);

// create playlist
router.post("/create/playlist", uploadPlaylist.single("photo"), Controller.createPlaylist);

// remove playlist
router.post("/remove/playlist", Controller.removePlaylist);

// Get playlist
router.post("/getAll/playlist", Controller.getPlaylist);

// Add video to Playlist
router.post("/playlist/addVideo", Controller.addVideoToPlaylist);

// Remove video from playlists
router.post("/playlist/removeVideo", Controller.removeVideoToPlaylist);

// Get All playlists Videos
router.post("/playlist/getAllVideo", Controller.getAllVideoFromPlaylist);



module.exports = router;