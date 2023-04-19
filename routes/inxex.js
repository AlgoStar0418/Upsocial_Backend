const express = require("express");
const router = express.Router();
const Controller = require("../controller/Controller");

// middleware
const validationPostRequest = (keys) => {
    return function (req, res, next) {
        keys.forEach(key => {
            if (!req.body[key]) res.status(404).json({ message: `Not found ${key} field!` });
        });
        next();
    }
}

// Admin: Create IPFS instance, and Orbit DB
router.post("/admin/createDB", Controller.CreateDBs);

// Admin: Get all users
router.get("/admin/getAllUsers", Controller.getAllUsers)

// User Register
router.post("/users/register", validationPostRequest(["username", "email", "password"]), Controller.userRegister);

// User Login
router.post("/users/login", validationPostRequest(["email", "password"]), Controller.userLogin);

// Set user status (Active and ban)
router.post("/users/set/userStatus", Controller.changeUserStatus);

// Set user's content status (Active and ban)
router.post("/users/set/content/ChangeStatus", Controller.changeContentStatus);

// Upload Content
router.post("/users/content/uploadContent", validationPostRequest(["title", "description", "keyword", "category", "userEmail", "ipfsUrl", "thumbnail"]), Controller.uploadContent)

// Get Uploaded Content by Email
router.post("/users/get/UploadedContent", validationPostRequest(["userEmail"]), Controller.GetUploadedContent);

// Get Uploaded Content by Email
router.post("/users/getAll/UploadedContent", Controller.GetAllUploadedContent);

module.exports = router;