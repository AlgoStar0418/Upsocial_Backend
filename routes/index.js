const express = require("express");
const router = express.Router();
const user = require("../controller/user");

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
router.post("/admin/createDB", user.CreateDBs);

// Admin: Get all users
router.post("/admin/getAllUsers", user.getAllUsers)

// User Register
router.post("/users/register", validationPostRequest(["username", "email", "password"]), user.userRegister);

// User Login
router.post("/users/login", validationPostRequest(["email", "password"]), user.userLogin);

// Upload Content
router.post("/users/content/uploadContent", validationPostRequest(["title", "description", "keyword", "category", "userEmail", "ipfsUrl"]), user.uploadContent)

module.exports = router;