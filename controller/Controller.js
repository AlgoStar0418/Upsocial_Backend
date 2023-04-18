const OrbitDB = require("orbit-db");
const IPFS = require("ipfs");


let ipfs;
let orbitdb;


let userDataDB; // User Profile Database
let contentDB; // Content Management Database

exports.CreateDBs = async (req, res) => {
    ipfs = await IPFS.create({
        EXPERIMENTAL: {
            pubsub: true,
        },
        repo: "UpsocialRepo"
    });

    orbitdb = await OrbitDB.createInstance(ipfs, {});

    userDataDB = await orbitdb.kvstore("userDB", { overwrite: true });
    await userDataDB.load();

    contentDB = await orbitdb.kvstore("contentDB", { overwrite: true });
    await contentDB.load();

    return res.status(200).json({ dbCreated: true });
};

exports.getAllUsers = (req, res) => {
    if (userDataDB != undefined) {
        const curUsers = userDataDB.all;
        const userData = Object.values(curUsers);

        return res.status(200).json({ userData: userData });
    } else {
        return res.status(200).json({ msg: "You have to Create DB ! Ask to Admin !", userData: null });
    }
};

exports.userRegister = async (req, res) => {

    const username = req.body.username;
    const email = req.body.email;
    const password = req.body.password;

    let userId = 0;

    if (userDataDB != undefined) {

        if (userDataDB.get(userId) != undefined) {
            const curUsers = userDataDB.all;
            userId = Object.keys(curUsers).length;
            let userTable = Object.values(curUsers);
            let userEmailTable = [];
            let userExist = false;

            for (var i = 0; i < userTable.length; i++) {
                userEmailTable.push(userTable[i]["email"]);
            }

            for (var i = 0; i < userEmailTable.length; i++) {
                if (userEmailTable[i] == email) {
                    userExist = true
                }
            }

            if (!userExist) {
                await userDataDB.put(userId, { username: username, email: email, password: password, status: true });
                return res.status(200).json({ msg: `${email} is registered success !`, status: true });
            } else {
                return res.status(200).json({ msg: `${email} is already registered !`, status: false });
            }


        } else {
            await userDataDB.put(userId, { username: username, email: email, password: password, status: true });
            return res.status(200).json({ msg: `${email} is registered success !`, status: true });
        }
    } else {
        return res.status(200).json({ msg: "You have to Create DB ! Ask to Admin !" });
    }

};

exports.userLogin = (req, res) => {
    const email = req.body.email;
    const password = req.body.password;

    let userId = 0;

    if (userDataDB != undefined) {

        if (userDataDB.get(userId) != undefined) {

            const curUsers = userDataDB.all;

            let userTable = Object.values(curUsers);

            let userAuth = false;

            for (var i = 0; i < userTable.length; i++) {
                if (userTable[i]["email"] == email && userTable[i]["password"] == password && userTable[i]["status"]) {
                    userAuth = true;
                }
            }

            if (!userAuth) {
                return res.status(200).json({ msg: `Auth failed!`, status: false });
            } else {
                return res.status(200).json({ msg: `Auth success!`, status: true, curUser: email });
            }

        } else {
            return res.status(200).json({ msg: `Your credentials not found!`, status: false });
        }
    } else {
        return res.status(200).json({ msg: "You have to Create DB ! Ask to Admin !" });
    }

};

exports.uploadContent = async (req, res) => {
    const title = req.body.title;
    const description = req.body.description;
    const keyword = req.body.keyword;
    const category = req.body.category;
    const userEmail = req.body.userEmail;
    const ipfsUrl = req.body.ipfsUrl;
    const thumbnail = req.body.thumbnail;

    let contentID = 0;

    if (contentDB != undefined) {

        if (contentDB.get(contentID) != undefined) {
            const curContents = contentDB.all;
            contentID = Object.keys(curContents).length;

            await contentDB.put(contentID, { email: userEmail, title: title, description: description, keyword: keyword, category: category, ipfsUrl: ipfsUrl, thumbnail: thumbnail });
            return res.status(200).json({ msg: `uploaded success`, status: true });

        } else {
            await contentDB.put(contentID, { email: userEmail, title: title, description: description, keyword: keyword, category: category, ipfsUrl: ipfsUrl, thumbnail: thumbnail });
            return res.status(200).json({ msg: `uploaded success`, status: true });
        }
    } else {
        return res.status(200).json({ msg: "You have to Create DB ! Ask to Admin !" });
    }
};

exports.GetUploadedContent = async (req, res) => {
    const userEmail = req.body.userEmail;
    const contentId = 0;
    if (contentDB != undefined) {

        if (contentDB.get(contentId) != undefined) {
            const allContents = contentDB.all;
            let contentsTable = Object.values(allContents);
            let resultVideos = [];

            for (var i = 0; i < contentsTable.length; i++) {
                if (contentsTable[i]["email"] == userEmail) {
                    resultVideos.push(contentsTable[i]);
                }
            }

            return res.status(200).json({ status: true, msg: "success!", data: resultVideos })

        } else {
            return res.status(200).json({ status: false, msg: "No Data", data: null });
        }
    } else {
        return res.status(200).json({ msg: "You have to Create DB ! Ask to Admin !" });
    }
};

exports.GetAllUploadedContent = (req, res) => {
    const contentId = 0;
    if (contentDB != undefined) {

        if (contentDB.get(contentId) != undefined) {
            const allContents = contentDB.all;
            let contentsTable = Object.values(allContents);

            return res.status(200).json({ status: true, msg: "success!", data: contentsTable })

        } else {
            return res.status(200).json({ status: false, msg: "No Data", data: null });
        }
    } else {
        return res.status(200).json({ msg: "You have to Create DB ! Ask to Admin !" });
    }
};

exports.changeUserStatus = async (req, res) => {
    const userEmail = req.body.userEmail;
    const status = req.body.status;
    console.log("start", userEmail, status);
    let userId = 0;
    if (userDataDB != undefined) {

        if (userDataDB.get(userId) != undefined) {
            console.log("userdatadb is exist !");

            const curUsers = userDataDB.all;

            let userTable = Object.values(curUsers);

            let userExist = false;
            let username;
            let password;

            for (var i = 0; i < userTable.length; i++) {
                console.log(userTable[i]["email"], "====", userEmail);
                if (userTable[i]["email"] == userEmail) {
                    userId = i;
                    username = userTable[i]["username"];
                    password = userTable[i]["password"];
                    userExist = true;
                }
            }

            if (!userExist) {
                return res.status(200).json({ msg: `User is not registered!`, status: false });
            } else {
                console.log(userId, username, password, status, "*******************");
                await userDataDB.set(userId, { username: username, email: userEmail, password: password, status: status });
                return res.status(200).json({ msg: `Success!`, status: true });
            }

        } else {
            return res.status(200).json({ msg: `You are not registered!`, status: false });
        }
    } else {
        return res.status(200).json({ msg: "You have to Create DB ! Ask to Admin !" });
    }
};