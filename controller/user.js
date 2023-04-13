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
    const curUsers = userDataDB.all;
    const userData = Object.values(curUsers);

    return res.status(200).json({ userData: userData });
};

exports.userRegister = async (req, res) => {
    console.log(req.body);
    const username = req.body.username;
    const email = req.body.email;
    const password = req.body.password;

    let userId = 0;

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
            await userDataDB.put(userId, { username: username, email: email, password: password });
            return res.status(200).json({ msg: `${email} is registered success !`, status: true });
        } else {
            return res.status(200).json({ msg: `${email} is already registered !`, status: false });
        }


    } else {
        await userDataDB.put(userId, { username: username, email: email, password: password });
        return res.status(200).json({ msg: `${email} is registered success !`, status: true });
    }
};

exports.userLogin = (req, res) => {
    console.log(req.body);
    const email = req.body.email;
    const password = req.body.password;

    let userId = 0;

    if (userDataDB.get(userId) != undefined) {

        const curUsers = userDataDB.all;

        let userTable = Object.values(curUsers);

        let userAuth = false;

        for (var i = 0; i < userTable.length; i++) {
            if (userTable[i]["email"] == email && userTable[i]["password"] == password) {
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

};

exports.uploadContent = async (req, res) => {
    const title = req.body.title;
    const description = req.body.description;
    const keyword = req.body.keyword;
    const category = req.body.category;
    const userEmail = req.body.userEmail;
    const ipfsUrl = req.body.ipfsUrl;
    let contentId = userEmail;

    if (contentDB.get(contentId) != undefined) {
        const allContents = contentDB.get(contentId);
        let curData = allContents.data;
        curData.push({
            title: title,
            description: description,
            keyword: keyword,
            category: category,
            ipfsUrl: ipfsUrl
        });
        console.log(curData);

        let updated = { data: curData };
        await contentDB.set(userEmail, updated);

        return res.status(200).json({ status: true, msg: "Success !" })

    } else {
        await contentDB.put(userEmail, {
            data: [{ title: title, description: description, keyword: keyword, category: category, ipfsUrl: ipfsUrl }]
        });
        return res.status(200).json({ status: true, msg: "Success !" });
    }
};