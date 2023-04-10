const OrbitDB = require("orbit-db");
const IPFS = require("ipfs");


let userDataDB;
let ipfs;
let orbitdb;

exports.PrepareIPFSInstance = async (req, res) => {
    ipfs = await IPFS.create({
        EXPERIMENTAL: {
            pubsub: true,
        },
        repo: "firstRepo"
    });

    orbitdb = await OrbitDB.createInstance(ipfs, {});

    userDataDB = await orbitdb.kvstore("userProfile", { overwrite: true });
    await userDataDB.load();


    return res.status(200).json({ dbCreated: true });
};

exports.getAllUsers = (req, res) => {
    const curUsers = userDataDB.all;
    const userData = Object.values(curUsers);

    return res.status(200).json({ userData: userData });
};

exports.userRegister = async (req, res) => {
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
    const email = req.body.email;
    const password = req.body.password;

};