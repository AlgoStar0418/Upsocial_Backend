require('dotenv').config();
const OrbitDB = require("orbit-db");
const axios = require('axios');
const { create } = require("ipfs-http-client");
const { exec } = require('node:child_process');
const fs = require('fs');
const filesize = require("file-size");
const nodemailer = require('nodemailer');
const smtpTransport = require('nodemailer-smtp-transport');
const { encryptString, decryptString } = require('encrypt-string');

// recommendation system configure value
let jsrecommender = require("js-recommender");
let recommender = new jsrecommender.Recommender();
let table = new jsrecommender.Table();

const generateRandomString = length => {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
};

const items = [
    { id: 1, name: 'Animation' },
    { id: 2, name: 'Autos & Vehicles' },
    { id: 3, name: 'Beauty & Fashion' },
    { id: 4, name: 'Comedy' },
    { id: 5, name: 'Cooking & Food' },
    { id: 6, name: 'DIY & Crafts' },
    { id: 7, name: 'Documentary' },
    { id: 8, name: 'Education' },
    { id: 9, name: 'Entertainment' },
    { id: 10, name: 'Film & Animation' },
    { id: 11, name: 'Gaming' },
    { id: 12, name: 'Health & Fitness' },
    { id: 13, name: 'How-to & Style' },
    { id: 14, name: 'Kids & Family' },
    { id: 15, name: 'Music' },
    { id: 16, name: 'News & Politics' },
    { id: 17, name: 'Nonprofits & Activism' },
    { id: 18, name: 'People & Blogs' },
    { id: 19, name: 'Pets & Animals' },
    { id: 20, name: 'Science & Technology' },
    { id: 21, name: 'Sports' },
    { id: 22, name: 'Travel & Events' },
    { id: 23, name: 'Unboxing & Reviews' },
    { id: 24, name: 'Blogs' },
];

let ipfs = create(new URL('http://localhost:5001'));
let orbitdb;


let userDataDB; // User Profile Database
let contentDB; // Content Management Database
let channelDB; // Channel Management Database
let playlistDB; // Playlist Management Database

let hashHistories = [];

let ENCRYPT_PASS = process.env.ENCRYPT_PASS;
/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////

exports.CreateDBs = async (req, res) => {
    if (userDataDB == undefined && contentDB == undefined && channelDB == undefined && playlistDB == undefined) {
        // ipfs = await IPFS.create({
        //     EXPERIMENTAL: {
        //         pubsub: true,
        //     },
        //     repo: "UpsocialRepo"
        // });

        orbitdb = await OrbitDB.createInstance(ipfs, {});

        userDataDB = await orbitdb.kvstore("userDB", { overwrite: true });
        await userDataDB.load();

        contentDB = await orbitdb.kvstore("contentDB", { overwrite: true });
        await contentDB.load();

        channelDB = await orbitdb.kvstore("channelDB", { overwrite: true });
        await channelDB.load();

        playlistDB = await orbitdb.kvstore("playlistDB", { overwrite: true });
        await playlistDB.load();

        return res.status(200).json({ dbCreated: true });
    } else {
        return res.status(200).json({ dbCreated: true });
    }
};

/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////

exports.getAllUsers = (req, res) => {
    if (userDataDB != undefined) {
        const curUsers = userDataDB.all;
        const userData = Object.values(curUsers);

        return res.status(200).json({ userData: userData });
    } else {
        return res.status(200).json({ msg: "DB is not created ! Ask to Admin !", userData: null });
    }
};

/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////

exports.removeUser = async (req, res) => {
    const { userEmail } = req.body;
    if (userDataDB != undefined) {

        let curUsers = userDataDB.all;
        let userData = Object.values(curUsers);
        let userExist = false;
        let resultKey;

        if (userData.length > 0) {
            for (var i = 0; i < userData.length; i++) {
                if (userData[i]["email"] == userEmail) {
                    resultKey = userData[i]["ID"];
                    userExist = true;
                }
            }

            if (userExist) {
                await userDataDB.del(resultKey);
                return res.status(200).json({ msg: `Success Deleted!`, status: true });
            } else {
                return res.status(200).json({ msg: `The User is not existing !`, status: false });
            }
        } else {
            return res.status(200).json({ msg: `The User is not existing !`, status: false });
        }
    } else {
        return res.status(200).json({ msg: "DB is not created ! Ask to Admin !", userData: null });
    }
};

/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////

exports.getUsersByEmail = async (req, res) => {
    const userEmail = req.body.userEmail;
    if (userDataDB != undefined) {

        const curUsers = userDataDB.all;

        let userTable = Object.values(curUsers);

        let userExist = false;
        let result;
        if (userTable.length > 0) {
            for (var i = 0; i < userTable.length; i++) {
                if (userTable[i]["email"] == userEmail) {
                    result = userTable[i];
                    userExist = true;
                }
            }

            if (!userExist) {
                return res.status(200).json({ msg: `User is not registered!`, status: false });
            } else {
                return res.status(200).json({ msg: `Success!`, status: true, data: result });
            }
        } else {
            return res.status(200).json({ msg: `You are not registered!`, status: false });
        }
    } else {
        return res.status(200).json({ msg: "DB is not created ! Ask to Admin !" });
    }
};

/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////

exports.userRegister = async (req, res) => {

    const username = req.body.username;
    const email = req.body.email;
    const password = req.body.password;

    const encrypted_password = await encryptString(password, ENCRYPT_PASS);

    let userId = 0;

    if (userDataDB != undefined) {

        const curUsers = userDataDB.all;
        userId = Object.keys(curUsers).length;
        let userTable = Object.values(curUsers);
        let userEmailTable = [];
        let userExist = false;

        if (userId > 0) {
            for (var i = 0; i < userTable.length; i++) {
                userEmailTable.push(userTable[i]["email"]);
            }

            for (var i = 0; i < userEmailTable.length; i++) {
                if (userEmailTable[i] == email) {
                    userExist = true
                }
            }

            if (!userExist) {
                await userDataDB.put(userId, { ID: userId, username: username, email: email, password: encrypted_password, status: true, following: [], followers: [], Liked: [], Disliked: [] });
                return res.status(200).json({ msg: `${email} is registered success !`, status: true });
            } else {
                return res.status(200).json({ msg: `${email} is already registered !`, status: false });
            }
        } else {
            await userDataDB.put(userId, { ID: userId, username: username, email: email, password: encrypted_password, status: true, following: [], followers: [], Liked: [], Disliked: [] });
            return res.status(200).json({ msg: `${email} is registered success !`, status: true });
        }
    } else {
        return res.status(200).json({ msg: "DB is not created ! Ask to Admin !" });
    }

};

/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////

exports.editUser = async (req, res) => {
    const username = req.body.username;
    const email = req.body.email;
    const password = req.body.password;
    const userRole = req.body.userrole;

    const encrypted_password = await encryptString(password, ENCRYPT_PASS);

    let userId = 0;

    if (userDataDB != undefined) {

        const curUsers = userDataDB.all;
        userId = Object.keys(curUsers).length;
        let userTable = Object.values(curUsers);
        let userEmailTable = [];
        let userExist = false;

        let ext_status;
        let ext_following;
        let ext_followers;
        let ext_Liked;
        let ext_Disliked;

        if (userId > 0) {
            for (var i = 0; i < userTable.length; i++) {
                userEmailTable.push(userTable[i]["email"]);
            }

            for (var i = 0; i < userEmailTable.length; i++) {
                if (userEmailTable[i] == email) {
                    userExist = true
                    userId = userTable[i]["ID"];
                    ext_status = userTable[i]["status"];
                    ext_following = userTable[i]["following"];
                    ext_followers = userTable[i]["followers"];
                    ext_Liked = userTable[i]["Liked"];
                    ext_Disliked = userTable[i]["Disliked"];
                }
            }

            if (!userExist) {
                return res.status(200).json({ msg: `${email} is not registered yet !`, status: false });
            } else {
                await userDataDB.set(userId, { ID: userId, username: username, email: email, password: encrypted_password, ext_status: true, following: ext_following, followers: ext_followers, Liked: ext_Liked, Disliked: ext_Disliked, userrole: userRole });
                return res.status(200).json({ msg: `${email} is already registered !`, status: true });
            }
        } else {
            return res.status(200).json({ msg: `${email} is not registered yet !`, status: false });
        }
    } else {
        return res.status(200).json({ msg: "DB is not created ! Ask to Admin !" });
    }

};

/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////

exports.resetPassword = async (req, res) => {

    const { userEmail } = req.body;
    let userId = 0;
    if (userDataDB != undefined) {


        const curUsers = userDataDB.all;

        let userTable = Object.values(curUsers);

        if (userTable.length > 0) {

            let userAuth = false;
            let username;
            let password;
            let following;
            let followers;
            let status;
            let liked;
            let disliked;


            for (var i = 0; i < userTable.length; i++) {
                if (userTable[i]["email"] == userEmail && userTable[i]["status"]) {
                    userAuth = true;
                    userId = userTable[i]["ID"];
                    username = userTable[i]["username"];
                    password = userTable[i]["password"];
                    following = userTable[i]["following"];
                    followers = userTable[i]["followers"];
                    liked = userTable[i]["Liked"];
                    disliked = userTable[i]["Disliked"];
                    status = userTable[i]["status"];
                }
            }

            if (!userAuth) {
                return res.status(200).json({ msg: `Your Email is not registered!`, status: false });
            } else {

                const code = await generateRandomString(6);
                await userDataDB.set(userId, { ID: userId, username: username, email: userEmail, password: password, status: status, following: following, followers: followers, Liked: liked, Disliked: disliked, code: code });

                var transport = nodemailer.createTransport(
                    smtpTransport({
                        service: "Gmail",
                        auth: {
                            user: "stanislav.kogutstt2@gmail.com",
                            pass: "phlbvyefyuiddptp",
                        },
                    })
                );
                // setup e-mail data with unicode symbols
                var mailOptions = {
                    from: 'stanislav.kogutstt2@gmail.com', // sender address
                    to: userEmail, // list of receivers
                    subject: "Reset Password!", // Subject line
                    text: 'This your recovery code: ' + code, // plaintext body
                };
                // send mail with defined transport object
                transport.sendMail(mailOptions, function (error, response) {
                    if (error) {
                        return res.status(200).json({ msg: `We can't send code to his email!`, status: false });
                    } else {
                        return res.status(200).json({ msg: `Check your email and get code!`, status: true });
                    }
                });
            }

        } else {
            return res.status(200).json({ msg: `Your credentials not found!`, status: false });
        }
    } else {
        return res.status(200).json({ msg: "DB is not created ! Ask to Admin !" });
    }

};

/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////

exports.verifyCode = async (req, res) => {
    const { userEmail, code } = req.body;

    if (userDataDB != undefined) {
        const curUsers = userDataDB.all;
        let userTable = Object.values(curUsers);

        if (userTable.length > 0) {
            let userAuth = false;

            for (var i = 0; i < userTable.length; i++) {
                if (userTable[i]["email"] == userEmail && userTable[i]["code"] == code) {
                    userAuth = true;
                }
            }

            if (!userAuth) {
                return res.status(200).json({ msg: `Your code is not correct! Try Again!`, status: false });
            } else {
                return res.status(200).json({ msg: `Success! Reset your password!`, status: true });
            }
        } else {
            return res.status(200).json({ msg: `Your credentials not found!`, status: false });
        }
    } else {
        return res.status(200).json({ msg: "DB is not created ! Ask to Admin !" });
    }
};

/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////

exports.setNewPassword = async (req, res) => {
    const { userEmail, password } = req.body;

    const encrypted_password = await encryptString(password, ENCRYPT_PASS);

    let userId = 0;
    if (userDataDB != undefined) {


        const curUsers = userDataDB.all;
        let userTable = Object.values(curUsers);

        if (userTable.length > 0) {

            let userExist = false;

            let username;
            let status;
            let following;
            let followers;
            let liked;
            let disliked;

            for (var i = 0; i < userTable.length; i++) {
                if (userTable[i]["email"] == userEmail) {
                    userId = userTable[i]["ID"];
                    username = userTable[i]["username"];
                    status = userTable[i]["status"];
                    following = userTable[i]["following"];
                    followers = userTable[i]["followers"];
                    liked = userTable[i]["Liked"];
                    disliked = userTable[i]["Disliked"];
                    userExist = true;
                }
            }

            if (!userExist) {
                return res.status(200).json({ msg: `User is not registered!`, status: false });
            } else {
                await userDataDB.set(userId, { ID: userId, username: username, email: userEmail, password: encrypted_password, status: status, following: following, followers: followers, Liked: liked, Disliked: disliked });
                return res.status(200).json({ msg: `Success!`, status: true });
            }
        } else {
            return res.status(200).json({ msg: `You are not registered!`, status: false });
        }
    } else {
        return res.status(200).json({ msg: "DB is not created ! Ask to Admin !" });
    }
};
/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////

exports.userLogin = async (req, res) => {
    const email = req.body.email;
    const password = req.body.password;

    let userId = 0;

    if (userDataDB != undefined) {

        const curUsers = userDataDB.all;
        let userTable = Object.values(curUsers);

        if (userTable.length > 0) {

            let userAuth = false;

            for (var i = 0; i < userTable.length; i++) {
                if (userTable[i]["email"] == email && userTable[i]["status"]) {
                    const decrypted_password = await decryptString(userTable[i]["password"], ENCRYPT_PASS);
                    if (decrypted_password == password) {
                        userAuth = true;
                        userId = userTable[i]["ID"];
                    } else {
                        userAuth = false;
                    }
                }
            }

            if (!userAuth) {
                return res.status(200).json({ msg: `Auth failed!`, status: false });
            } else {
                const responseData = userDataDB.get(userId);
                return res.status(200).json({ msg: `Auth success!`, status: true, curUser: email, Data: responseData });
            }
        } else {
            return res.status(200).json({ msg: `Your credentials not found!`, status: false });
        }
    } else {
        return res.status(200).json({ msg: "DB is not created ! Ask to Admin !" });
    }

};

/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////

exports.uploadContent = async (req, res) => {
    const title = req.body.title;
    const description = req.body.description;
    const keyword = req.body.keyword;
    const category = req.body.category;
    const userEmail = req.body.userEmail;
    const ipfsUrl = req.body.ipfsUrl;
    const thumbnail = req.body.thumbnail;
    const status = true;

    let contentID = 0;

    if (contentDB != undefined) {

        if (contentDB.get(contentID) != undefined) {
            const curContents = contentDB.all;
            contentID = Object.keys(curContents).length;

            await contentDB.put(contentID, { ID: contentID, email: userEmail, title: title, description: description, keyword: keyword, category: category, ipfsUrl: video_src, thumbnail: data.ipfsUrl, status: status, liked: 0, disliked: 0, watched: 0, shared: 0, postDate: new Date(), comments: {}, followers: [] });
            return res.status(200).json({ msg: `uploaded success`, status: true });

        } else {
            await contentDB.put(contentID, { ID: contentID, email: userEmail, title: title, description: description, keyword: keyword, category: category, ipfsUrl: video_src, thumbnail: data.ipfsUrl, status: status, liked: 0, disliked: 0, watched: 0, shared: 0, postDate: new Date(), comments: {}, followers: [] });
            return res.status(200).json({ msg: `uploaded success`, status: true });
        }
    } else {
        return res.status(200).json({ msg: "DB is not created ! Ask to Admin !" });
    }
};

/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////

exports.likeContent = async (req, res) => {
    const { videoId, userEmail } = req.body;
    let userId = 0;
    if (userDataDB != undefined) {
        const curUsers = userDataDB.all;
        let userTable = Object.values(curUsers);

        if (userTable.length > 0) {
            let userExist = false;
            let username;
            let password;
            let following;
            let followers;
            let liked;
            let disliked;
            let status;

            for (var i = 0; i < userTable.length; i++) {
                if (userTable[i]["email"] == userEmail) {
                    userId = userTable[i]["ID"];
                    username = userTable[i]["username"];
                    password = userTable[i]["password"];
                    following = userTable[i]["following"];
                    followers = userTable[i]["followers"];
                    liked = userTable[i]["Liked"];
                    disliked = userTable[i]["Disliked"];
                    status = userTable[i]["status"];
                    userExist = true;
                }
            }

            if (!userExist) {
                return res.status(200).json({ msg: `User is not registered!`, status: false });
            } else {
                if (liked.includes(videoId) || disliked.includes(videoId)) {
                    return res.status(200).json({ msg: `You already liked this video !`, status: true });
                } else {
                    liked.push(videoId);
                    await userDataDB.set(userId, { ID: userId, username: username, email: userEmail, password: password, status: status, following: following, followers: followers, Liked: liked, Disliked: disliked });
                    return res.status(200).json({ msg: `Liked this video successful !`, status: true });
                }
            }

        } else {
            return res.status(200).json({ msg: `You are not registered!`, status: false });
        }
    } else {
        return res.status(200).json({ msg: "DB is not created ! Ask to Admin !" });
    }
};

/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////

exports.likeVideos = async (req, res) => {
    const { videoId, userEmail } = req.body;

    if (contentDB != undefined) {

        if (contentDB.get(videoId) != undefined) {
            const data = contentDB.get(videoId);

            let liked = data.liked + 1;

            await contentDB.put(videoId, { ID: videoId, email: userEmail, title: data.title, description: data.description, keyword: data.keyword, category: data.category, ipfsUrl: data.ipfsUrl, thumbnail: data.thumbnail, status: data.status, liked: liked, disliked: data.disliked, watched: data.watched, shared: data.shared, postDate: data.postDate, comments: data.comments, followers: data.followers });

            return res.status(200).json({ status: true, msg: "success!", data: data })

        } else {
            return res.status(200).json({ status: false, msg: "No Data", data: null });
        }
    } else {
        return res.status(200).json({ msg: "DB is not created ! Ask to Admin !" });
    }
};

/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////

exports.dislikeContent = async (req, res) => {
    const { videoId, userEmail } = req.body;
    let userId = 0;
    if (userDataDB != undefined) {
        const curUsers = userDataDB.all;
        let userTable = Object.values(curUsers);
        if (userTable.length > 0) {
            let userExist = false;
            let username;
            let password;
            let following;
            let followers;
            let liked;
            let disliked;
            let status;

            for (var i = 0; i < userTable.length; i++) {
                if (userTable[i]["email"] == userEmail) {
                    userId = userTable[i]["ID"];
                    username = userTable[i]["username"];
                    password = userTable[i]["password"];
                    following = userTable[i]["following"];
                    followers = userTable[i]["followers"];
                    liked = userTable[i]["Liked"];
                    disliked = userTable[i]["Disliked"];
                    status = userTable[i]["status"];
                    userExist = true;
                }
            }

            if (!userExist) {
                return res.status(200).json({ msg: `User is not registered!`, status: false });
            } else {
                if (disliked.includes(videoId) || liked.includes(videoId)) {
                    return res.status(200).json({ msg: `You already liked this video !`, status: true });
                } else {
                    disliked.push(videoId);
                    await userDataDB.set(userId, { ID: userId, username: username, email: userEmail, password: password, status: status, following: following, followers: followers, Liked: liked, Disliked: disliked });
                    return res.status(200).json({ msg: `Liked this video successful !`, status: true });
                }
            }

        } else {
            return res.status(200).json({ msg: `You are not registered!`, status: false });
        }
    } else {
        return res.status(200).json({ msg: "DB is not created ! Ask to Admin !" });
    }

};

/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////

exports.dislikeVideos = async (req, res) => {
    const { videoId, userEmail } = req.body;

    if (contentDB != undefined) {

        if (contentDB.get(videoId) != undefined) {
            const data = contentDB.get(videoId);

            let disliked = data.disliked + 1;

            await contentDB.put(videoId, { ID: videoId, email: userEmail, title: data.title, description: data.description, keyword: data.keyword, category: data.category, ipfsUrl: data.ipfsUrl, thumbnail: data.thumbnail, status: data.status, liked: data.liked, disliked: disliked, watched: data.watched, shared: data.shared, postDate: data.postDate, comments: data.comments, followers: data.followers });

            return res.status(200).json({ status: true, msg: "success!", data: data })

        } else {
            return res.status(200).json({ status: false, msg: "No Data", data: null });
        }
    } else {
        return res.status(200).json({ msg: "DB is not created ! Ask to Admin !" });
    }
};

/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////

exports.personalized = async (req, res) => {
    const { userEmail } = req.body;

    if (userDataDB != undefined || contentDB != undefined) {
        // user data
        const curUsers = userDataDB.all;
        const userData = Object.values(curUsers);

        // content data
        const allContents = contentDB.all;
        let contentsTable = Object.values(allContents);

        // selected user index
        index = userData.findIndex(x => x.email === userEmail);

        // set table
        userData.map((item, key) => {
            for (var i = 0; i < item.Liked.length; i++) {
                table.setCell(item.Liked[i].toString(), item.email, 1);
            }
            for (var i = 0; i < item.Disliked.length; i++) {
                table.setCell(item.Disliked[i].toString(), item.email, 0);
            }
        });

        // Get predict table
        var model = recommender.fit(table);
        predicted_table = recommender.transform(table);
        var resultids = [];
        var feeds = [];

        // get recommended video ids
        for (var i = 0; i < predicted_table.columnNames.length; ++i) {
            var user = predicted_table.columnNames[i];
            if (user == userEmail) {
                for (var j = 0; j < predicted_table.rowNames.length; ++j) {
                    var movie = predicted_table.rowNames[j];
                    if (!Math.round(table.getCell(movie, user)) && Math.round(predicted_table.getCell(movie, user)) > 0) {
                        console.log(movie);
                        resultids.push(movie);
                    }
                }
            }
        }

        if (resultids.length > 0) {
            for (var i = 0; i < resultids.length; i++) {
                feeds.push(contentsTable[Number([resultids[i]])]);
            }
            return res.status(200).json({ status: true, msg: "success", feeds: feeds, videoIds: resultids });
        } else {
            return res.status(200).json({ status: false, msg: "No Feeds, Your interaction data is not enough", feeds: null });
        }

    } else {
        return res.status(200).json({ msg: "DB is not created ! Ask to Admin !", userData: null });
    }
};

/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////

exports.Web_uploadContent = (req, res) => {
    const { file } = req;
    const { title, description, keywords, category, userEmail, video_src } = req.body;

    if (file) {
        const addThumbnailProcess = exec(`ipfs add ./thumbnail/${file.filename}`);

        addThumbnailProcess.stdout.on('data', async function (result) {
            if (result && result.indexOf('added') >= 0) {
                const hashCode = result.split(' ')[1];
                const stats = await fs.statSync(`./thumbnail/${file.filename}`);
                const size = filesize(stats.size).human('si');
                const data = {
                    filename: file.filename,
                    sourceType: 'file',
                    createdAt: (Date.now()).toString(),
                    ipfsUrl: process.env.IPFS_BASE_URL + hashCode,
                    hashCode: hashCode,
                    size: size,
                }

                let contentID = 0;
                const status = true;

                if (contentDB != undefined) {

                    const curContents = contentDB.all;
                    contentID = Object.keys(curContents).length;

                    if (contentID > 0) {
                        await contentDB.put(contentID, { ID: contentID, email: userEmail, title: title, description: description, keyword: keywords, category: category, ipfsUrl: video_src, thumbnail: data.ipfsUrl, status: status, liked: 0, disliked: 0, watched: 0, shared: 0, postDate: new Date(), comments: {}, followers: [] });
                        return res.status(200).json({ msg: `uploaded success`, status: true });

                    } else {
                        await contentDB.put(contentID, { ID: contentID, email: userEmail, title: title, description: description, keyword: keywords, category: category, ipfsUrl: video_src, thumbnail: data.ipfsUrl, status: status, liked: 0, disliked: 0, watched: 0, shared: 0, postDate: new Date(), comments: {}, followers: [] });
                        return res.status(200).json({ msg: `uploaded success`, status: true });
                    }
                } else {
                    return res.status(200).json({ msg: "DB is not created ! Ask to Admin !" });
                }
            }
        });
    } else {
        return res.json({
            result: false,
            data: "No Thumbnail file"
        });
    }
};


////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////

exports.GetUploadedContent = async (req, res) => {
    const userEmail = req.body.userEmail;
    if (contentDB != undefined) {
        const allContents = contentDB.all;
        let contentsTable = Object.values(allContents);
        if (contentsTable.length > 0) {
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
        return res.status(200).json({ msg: "DB is not created ! Ask to Admin !" });
    }
};

/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////

exports.GetUploadedContentByCategory = (req, res) => {
    const categoryName = req.body.categoryName;

    var targetCategory = items.find(item => item.name == categoryName);
    var targetID;
    if (targetCategory == undefined) {
        console.log("Not present")
        return res.json({ msg: "Not present", status: false })
    } else {
        targetID = targetCategory.id
    }

    if (contentDB != undefined) {
        const allContents = contentDB.all;
        let contentsTable = Object.values(allContents);
        if (contentsTable.length > 0) {
            let resultVideos = [];

            for (var i = 0; i < contentsTable.length; i++) {
                if (contentsTable[i]["category"].includes(targetID)) {
                    resultVideos.push(contentsTable[i]);
                }
            }
            return res.status(200).json({ status: true, msg: "success!", data: resultVideos })

        } else {
            return res.status(200).json({ status: false, msg: "No Data", data: null });
        }
    } else {
        return res.status(200).json({ msg: "DB is not created ! Ask to Admin !" });
    }

};

/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////

exports.GetAllUploadedContent = (req, res) => {
    let start = 0;
    let limit = req.body.limit;
    if (contentDB != undefined) {
        const allContents = contentDB.all;
        let contentsTable = Object.values(allContents);
        if (contentsTable.length > 0) {
            if (limit > contentsTable.length) {
                return res.status(200).json({ status: true, msg: "success!", data: contentsTable })
            } else {
                let resultDB = contentsTable.slice(start, limit);
                return res.status(200).json({ status: true, msg: "success!", data: resultDB })
            }
        } else {
            return res.status(200).json({ status: false, msg: "No Data", data: null });
        }
    } else {
        return res.status(200).json({ msg: "DB is not created ! Ask to Admin !" });
    }
};

/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////

exports.changeUserStatus = async (req, res) => {
    const userEmail = req.body.userEmail;
    const status = req.body.status;
    let userId = 0;
    if (userDataDB != undefined) {
        const curUsers = userDataDB.all;
        let userTable = Object.values(curUsers);

        if (userTable.length > 0) {
            let userExist = false;
            let username;
            let password;
            let following;
            let followers;
            let liked;
            let disliked;

            for (var i = 0; i < userTable.length; i++) {
                if (userTable[i]["email"] == userEmail) {
                    userId = userTable[i]["ID"];
                    username = userTable[i]["username"];
                    password = userTable[i]["password"];
                    following = userTable[i]["following"];
                    followers = userTable[i]["followers"];
                    liked = userTable[i]["Liked"];
                    disliked = userTable[i]["Disliked"];
                    userExist = true;
                }
            }

            if (!userExist) {
                return res.status(200).json({ msg: `User is not registered!`, status: false });
            } else {
                await userDataDB.set(userId, { ID: userId, username: username, email: userEmail, password: password, status: status, following: following, followers: followers, Liked: liked, Disliked: disliked });
                return res.status(200).json({ msg: `Success!`, status: true });
            }

        } else {
            return res.status(200).json({ msg: `You are not registered!`, status: false });
        }
    } else {
        return res.status(200).json({ msg: "DB is not created ! Ask to Admin !" });
    }
};

/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////

exports.followUser = async (req, res) => {
    const { curUser, tarUser } = req.body;

    if (userDataDB != undefined) {
        const curUsers = userDataDB.all;
        let userTable = Object.values(curUsers);
        if (userTable.length > 0) {
            let flag = false;

            let curUserId;
            let curUsername;
            let curPassword;
            let curStatus;
            let curFollowers;
            let curFollowing;
            let curLiked;
            let curDisliked;

            let tarUserId;
            let tarUsername;
            let tarPassword;
            let tarStatus;
            let tarFollowers;
            let tarFollowing;
            let tarLiked;
            let tarDisliked;

            for (var i = 0; i < userTable.length; i++) {
                if (userTable[i]["email"] == curUser) {
                    curUserId = userTable[i]["ID"];
                    curUsername = userTable[i]["username"];
                    curPassword = userTable[i]["password"];
                    curStatus = userTable[i]["status"];
                    curFollowers = userTable[i]["followers"];
                    curFollowing = userTable[i]["following"];
                    curLiked = userTable[i]["Liked"];
                    curDisliked = userTable[i]["Disliked"];
                }
                if (userTable[i]["email"] == tarUser) {
                    tarUserId = userTable[i]["ID"];
                    tarUsername = userTable[i]["username"];
                    tarPassword = userTable[i]["password"];
                    tarStatus = userTable[i]["status"];
                    tarFollowers = userTable[i]["followers"];
                    tarFollowing = userTable[i]["following"];
                    tarLiked = userTable[i]["Liked"];
                    tarDisliked = userTable[i]["Disliked"];
                }
            }

            if (curFollowing.includes(tarUser) && tarFollowers.includes(curUser)) {
                flag = true;
            }

            if (flag) {
                return res.status(200).json({ msg: `Already followed!`, status: false });
            } else {
                curFollowing.push(tarUser);
                tarFollowers.push(curUser);
                await userDataDB.set(curUserId, { ID: curUserId, username: curUsername, email: curUser, password: curPassword, status: curStatus, following: curFollowing, followers: curFollowers, Liked: curLiked, Disliked: curDisliked });
                await userDataDB.set(tarUserId, { ID: tarUserId, username: tarUsername, email: tarUser, password: tarPassword, status: tarStatus, following: tarFollowing, followers: tarFollowers, Liked: tarLiked, Disliked: tarDisliked });
                return res.status(200).json({ msg: `Follow Successful!`, status: true });
            }

        } else {
            return res.status(200).json({ msg: `You are not registered!`, status: false });
        }
    } else {
        return res.status(200).json({ msg: "DB is not created ! Ask to Admin !" });
    }
};

/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////

exports.unfollowUser = async (req, res) => {
    const { curUser, tarUser } = req.body;
    if (userDataDB != undefined) {
        const curUsers = userDataDB.all;
        let userTable = Object.values(curUsers);
        if (userTable.length > 0) {
            let flag = false;

            let curUserId;
            let curUsername;
            let curPassword;
            let curStatus;
            let curFollowers;
            let curFollowing;
            let curLiked;
            let curDisliked;

            let tarUserId;
            let tarUsername;
            let tarPassword;
            let tarStatus;
            let tarFollowers;
            let tarFollowing;
            let tarLiked;
            let tarDisliked;

            for (var i = 0; i < userTable.length; i++) {
                if (userTable[i]["email"] == curUser) {
                    curUserId = userTable[i]["ID"];
                    curUsername = userTable[i]["username"];
                    curPassword = userTable[i]["password"];
                    curStatus = userTable[i]["status"];
                    curFollowers = userTable[i]["followers"];
                    curFollowing = userTable[i]["following"];
                    curLiked = userTable[i]["Liked"];
                    curDisliked = userTable[i]["Disliked"];
                }
                if (userTable[i]["email"] == tarUser) {
                    tarUserId = userTable[i]["ID"];
                    tarUsername = userTable[i]["username"];
                    tarPassword = userTable[i]["password"];
                    tarStatus = userTable[i]["status"];
                    tarFollowers = userTable[i]["followers"];
                    tarFollowing = userTable[i]["following"];
                    tarLiked = userTable[i]["Liked"];
                    tarDisliked = userTable[i]["Disliked"];
                }
            }

            if (curFollowing.includes(tarUser) && tarFollowers.includes(curUser)) {
                flag = true;
            }

            if (flag) {
                curFollowing.splice(curFollowing.indexOf(tarUser), 1);
                tarFollowers.splice(curFollowing.indexOf(curUser), 1);
                await userDataDB.set(curUserId, { ID: curUserId, username: curUsername, email: curUser, password: curPassword, status: curStatus, following: curFollowing, followers: curFollowers, Liked: curLiked, Disliked: curDisliked });
                await userDataDB.set(tarUserId, { ID: tarUserId, username: tarUsername, email: tarUser, password: tarPassword, status: tarStatus, following: tarFollowing, followers: tarFollowers, Liked: tarLiked, Disliked: tarDisliked });
                return res.status(200).json({ msg: `unFollow Successful!`, status: true });
            } else {
                return res.status(200).json({ msg: `You didn't followed yet!`, status: false });
            }

        } else {
            return res.status(200).json({ msg: `You are not registered!`, status: false });
        }
    } else {
        return res.status(200).json({ msg: "DB is not created ! Ask to Admin !" });
    }
};

/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////

exports.changeContentStatus = async (req, res) => {
    const userEmail = req.body.userEmail;
    const contentID = req.body.Id;
    const status = req.body.status;

    if (contentDB != undefined) {

        if (contentDB.get(contentID) != undefined) {
            const data = contentDB.get(contentID);

            await contentDB.put(contentID, { ID: contentID, email: userEmail, title: data.title, description: data.description, keyword: data.keyword, category: data.category, ipfsUrl: data.ipfsUrl, thumbnail: data.thumbnail, status: status, liked: data.liked, disliked: data.disliked, watched: data.watched, shared: data.shared, postDate: data.postDate, comments: data.comments, followers: data.followers });

            return res.status(200).json({ status: true, msg: "success!", data: data })

        } else {
            return res.status(200).json({ status: false, msg: "No Data", data: null });
        }
    } else {
        return res.status(200).json({ msg: "DB is not created ! Ask to Admin !" });
    }
};

/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////

exports.generateIPFS = async (req, res) => {
    const { url, timestamp, email } = req.body;
    const { file } = req;
    const ip = req.headers['x-real-ip'] || '';

    let histories = [];
    for (let i = 0; i < hashHistories.length; i++) {
        const jsonData = await axios({
            method: 'get',
            url: `${process.env.IPFS_BASE_URL}/${hashHistories[i].jsonHashCode}`
        });
        if (jsonData && jsonData.data) {
            histories.push(jsonData.data);
        }
    }

    if (file) {
        console.log('ipfs add ==========>', `ipfs add ./downloads/${file.filename}`);
        const addVideoProcess = exec(`ipfs add ./downloads/${file.filename}`);

        addVideoProcess.stdout.on('data', async function (result) {
            if (result && result.indexOf('added') >= 0) {
                const hashCode = result.split(' ')[1];
                const stats = await fs.statSync(`./downloads/${file.filename}`);
                const size = filesize(stats.size).human('si');
                const data = {
                    filename: file.filename,
                    sourceType: 'file',
                    createdAt: (Date.now()).toString(),
                    ipfsUrl: process.env.IPFS_BASE_URL + hashCode,
                    hashCode: hashCode,
                    size: size,
                    ip,
                    email
                }
                // saveHistory(data);
                return res.json({
                    result: true,
                    data: data
                });
            }
        });
    } else {
        console.log('start downloading =========>', url, timestamp);
        let type = 'youtube';
        let videoId = '';
        if (url.indexOf('vimeo') >= 0) {
            type = 'vimeo';
        }
        if (type === 'youtube') {
            videoId = youtube_parser(url);
        } else {
            videoId = vimeo_parser(url);
        }

        console.log('prepare download =========>', `yt-dlp -o ./downloads/${videoId}.mp4 "${url}" -f "mp4"`);
        const downloadProcess = exec(`yt-dlp -o ./downloads/${videoId}.mp4 "${url}" -f "mp4"`);
        downloadProcess.stderr.on('data', function (err) {
            if (err && err.includes('WARNING') < 0) {
                console.log('download error =========>', err);
                return res.json({
                    result: false,
                    error: err
                });
            }
        });
        downloadProcess.stdout.on('data', async function (data) {
            console.log('downloading =========>', data, converting);
            if (data && data.indexOf('has already been downloaded') >= 0) {
                console.log('download success 222 **********>' + `${videoId}.mp4`);
                setTimeout(async () => {
                    const addProcess = exec(`ipfs add ./downloads/${videoId}.mp4`);

                    addProcess.stdout.on('data', async function (data1) {
                        if (data1 && data1.indexOf('added') >= 0) {
                            const hashCode = data1.split(' ')[1];
                            const stats = await fs.statSync(`./downloads/${videoId}.mp4`);
                            const size = filesize(stats.size).human('si');
                            const data = {
                                filename: `${videoId}.mp4`,
                                sourceType: type,
                                url: url,
                                createdAt: (Date.now()).toString(),
                                ipfsUrl: process.env.IPFS_BASE_URL + hashCode,
                                size: size,
                                hashCode: hashCode,
                                ip,
                                email
                            }
                            saveHistory(data);
                            return res.json({
                                result: true,
                                data: data
                            });
                        }
                    });
                }, 500);
            }

            const percentPos = data.indexOf("%");
            if (percentPos > 7) {
                const percent = data.slice(percentPos - 6, percentPos);
                const index = converting.findIndex((item) => item && item.timestamp === timestamp);
                if (index >= 0) {
                    converting[index].percent = percent;

                    if (data.indexOf('100%') >= 0) {
                        console.log('download success **********>', converting[index]);
                        converting[index].percent = '100';
                        converting[index].status = 'uploading';
                        setTimeout(async () => {
                            const addProcess = exec(`ipfs add ./downloads/${videoId}.mp4`);

                            addProcess.stdout.on('data', async function (data1) {
                                if (data1 && data1.indexOf('added') >= 0) {
                                    const hashCode = data1.split(' ')[1];
                                    const stats = await fs.statSync(`./downloads/${videoId}.mp4`);
                                    const size = filesize(stats.size).human('si');
                                    const data = {
                                        filename: `${videoId}.mp4`,
                                        sourceType: type,
                                        url: url,
                                        createdAt: (Date.now()).toString(),
                                        ipfsUrl: process.env.IPFS_BASE_URL + hashCode,
                                        size: size,
                                        ip,
                                        hashCode: hashCode,
                                        email
                                    }
                                    saveHistory(data);
                                    return res.json({
                                        result: true,
                                        data: data
                                    });
                                }
                            });
                        }, 500);
                    }
                } else {
                    converting.push({
                        timestamp,
                        url,
                        percent: 0,
                        status: 'downloading'
                    });
                }
            }
        });
    }
};

/////////////////////////////////////////////////////////////////////////
/////////////////////// Save History ////////////////////////////////////

function saveHistory(history) {
    const filename = history.filename.replace('.mp4', '.json');
    fs.writeFile(`./downloads/${filename}`, JSON.stringify(history), 'utf8', function (err, data) {
        if (err) {
            console.log('save history error ======>', err);
        }

        const addJsonProcess = exec(`ipfs add ./downloads/${filename}`);

        addJsonProcess.stdout.on('data', async function (result) {
            if (result && result.indexOf('added') >= 0) {
                const hashCode = result.split(' ')[1];
                hashHistories.push({
                    hashCode: history.hashCode,
                    jsonHashCode: hashCode
                });
                let h = new History();
                h.filename = history.filename;
                h.sourceType = history.sourceType;
                h.url = history.url;
                h.ipfsUrl = history.ipfsUrl;
                h.size = history.size;
                h.createdAt = history.createdAt;
                h.ip = history.ip;
                h.hashCode = history.hashCode;
                h.jsonHashCode = hashCode;
                h.email = history.email;
                h.save();
            }
        });
    });
}

/////////////////////////////////////////////////////////////////////////
/////////////////////// Save History ////////////////////////////////////

function youtube_parser(url) {
    var regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    var match = url.match(regExp);
    return (match && match[7].length == 11) ? match[7] : false;
}

/////////////////////////////////////////////////////////////////////////
/////////////////////// Save History ////////////////////////////////////

function vimeo_parser(url) {
    // Look for a string with 'vimeo', then whatever, then a
    // forward slash and a group of digits.
    var match = /vimeo.*\/(\d+)/i.exec(url);

    // If the match isn't null (i.e. it matched)
    if (match) {
        // The grouped/matched digits from the regex
        return match[1];
    }
    return false;
}

/////////////////////////////////////////////////////////////////////////
/////////////////////// Save History ////////////////////////////////////

exports.uploadPhoto = async (req, res) => {
    const { file } = req;
    const { name, handle, description, location, userEmail } = req.body;

    if (file) {
        const addPhotoProcess = exec(`ipfs add ./photos/${file.filename}`);

        addPhotoProcess.stdout.on('data', async function (result) {
            if (result && result.indexOf('added') >= 0) {
                const hashCode = result.split(' ')[1];
                const stats = await fs.statSync(`./photos/${file.filename}`);
                const size = filesize(stats.size).human('si');
                const data = {
                    filename: file.filename,
                    sourceType: 'file',
                    createdAt: (Date.now()).toString(),
                    ipfsUrl: process.env.IPFS_BASE_URL + hashCode,
                    hashCode: hashCode,
                    size: size,
                }
                let userId = 0;
                if (userDataDB != undefined) {
                    const curUsers = userDataDB.all;
                    let userTable = Object.values(curUsers);

                    if (userTable.length > 0) {

                        let userExist = false;
                        let password;
                        let status;
                        let followers;
                        let following;
                        let liked;
                        let disliked;

                        for (var i = 0; i < userTable.length; i++) {
                            if (userTable[i]["email"] == userEmail) {
                                userId = userTable[i]["ID"];
                                status = userTable[i]["status"];
                                password = userTable[i]["password"];
                                followers = userTable[i]["followers"];
                                following = userTable[i]["following"];
                                liked = userTable[i]["Liked"];
                                disliked = userTable[i]["Disliked"];
                                userExist = true;
                            }
                        }

                        if (!userExist) {
                            return res.status(200).json({ msg: `User is not registered!`, status: false });
                        } else {
                            await userDataDB.set(userId, { ID: userId, username: name, email: userEmail, password: password, status: status, handle: handle, description: description, location: location, photo: data.ipfsUrl, followers: followers, following: following, Liked: liked, Disliked: disliked });
                            return res.status(200).json({ msg: `Success!`, status: true, data: data });
                        }

                    } else {
                        return res.status(200).json({ msg: `Saving your profile is change!`, status: false });
                    }
                } else {
                    return res.status(200).json({ msg: "DB is not created ! Ask to Admin !" });
                }
            }
        });
    } else {
        return res.json({
            result: false,
            data: "No photo file"
        });
    }
}

/////////////////////////////////////////////////////////////////////////
/////////////////////// Save History ////////////////////////////////////

exports.createChannel = async (req, res) => {
    const { file } = req;
    const { channelName, handleUrl, aboutChannel, location, tags, url, userEmail } = req.body;
    if (file) {
        const addPhotoProcess = exec(`ipfs add ./photos/${file.filename}`);

        addPhotoProcess.stdout.on('data', async function (result) {
            if (result && result.indexOf('added') >= 0) {
                const hashCode = result.split(' ')[1];
                const stats = await fs.statSync(`./photos/${file.filename}`);
                const size = filesize(stats.size).human('si');
                const data = {
                    filename: file.filename,
                    sourceType: 'file',
                    createdAt: (Date.now()).toString(),
                    ipfsUrl: process.env.IPFS_BASE_URL + hashCode,
                    hashCode: hashCode,
                    size: size,
                }
                if (channelDB != undefined) {
                    const curChannels = channelDB.all;
                    let channelTable = Object.values(curChannels);

                    if (channelTable.length > 0) {

                        let channelExist = false;

                        for (var i = 0; i < channelTable.length; i++) {
                            if (channelTable[i]["email"] == userEmail && channelTable[i]["channelName"] == channelName) {
                                channelExist = true;
                            }
                        }

                        if (channelExist) {
                            return res.status(200).json({ msg: `Channel name is not unique. Choose another name!`, status: false });
                        } else {
                            let id = channelTable.length;

                            await channelDB.set(id, { channelName: channelName, email: userEmail, handleUrl: handleUrl, aboutChannel: aboutChannel, tags: tags, location: location, url: url, photo: data.ipfsUrl, followers: [], contents: {} });
                            return res.status(200).json({ msg: `Creating channel is success!`, status: true });
                        }

                    } else {
                        await channelDB.set(0, { channelName: channelName, email: userEmail, handleUrl: handleUrl, aboutChannel: aboutChannel, tags: tags, location: location, url: url, photo: data.ipfsUrl, followers: [], contents: {} });
                        return res.status(200).json({ msg: `Channel creation is successful!`, status: true });
                    }
                } else {
                    return res.status(200).json({ msg: "DB is not created ! Ask to Admin !", status: false });
                }
            }
        });
    } else {
        return res.json({
            result: false,
            data: "No photo file"
        });
    }
};

/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////

exports.getAllChannels = (req, res) => {
    if (channelDB != undefined) {
        const curChannels = channelDB.all;
        const channelData = Object.values(curChannels);

        return res.status(200).json({ channelData: channelData });
    } else {
        return res.status(200).json({ msg: "DB is not created ! Ask to Admin !", channelData: null });
    }
};

/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////

exports.getChannelByUser = (req, res) => {
    const { userEmail } = req.body;

    if (channelDB != undefined) {
        const allChannels = channelDB.all;
        const channelData = Object.values(allChannels);
        if (channelData.length > 0) {
            let result = [];

            for (var i = 0; i < channelData.length; i++) {
                if (channelData[i]["email"] == userEmail) {
                    result.push(channelData[i]);
                }
            }

            return res.status(200).json({ status: true, msg: "success!", channelData: result })

        } else {
            return res.status(200).json({ status: false, msg: "No Data", channelData: null });
        }
    } else {
        return res.status(200).json({ msg: "DB is not created ! Ask to Admin !", channelData: null });
    }

};

/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////

exports.followChannel = async (req, res) => {
    const { curUser, channelName, aboutChannel, handleUrl, location, tags, url, photo, userEmail } = req.body;

    if (channelDB != undefined) {
        const allChannels = channelDB.all;
        const channelData = Object.values(allChannels);
        if (channelData.length > 0) {
            let channelExist = false;
            let result;
            let curFollowers;
            let curContents;
            let id;
            let targetFollwers;

            for (var i = 0; i < channelData.length; i++) {
                if (channelData[i]["email"] == userEmail) {
                    id = i;
                    channelExist = true;
                    curFollowers = channelData[i]["followers"];
                    curContents = channelData[i]["contents"];
                }
            }
            targetFollwers = Object.values(curFollowers);

            if (!targetFollwers.includes(curUser)) {
                targetFollwers.push(curUser)
            }

            if (channelExist) {
                await channelDB.set(id, {
                    channelName: channelName,
                    email: userEmail,
                    handleUrl: handleUrl,
                    aboutChannel: aboutChannel,
                    tags: tags,
                    location: location,
                    url: url,
                    photo: photo,
                    followers: targetFollwers,
                    contents: curContents
                });
                result = await channelDB.get(id);
                return res.status(200).json({ status: true, msg: "success!", channelData: result })
            } else {
                return res.status(200).json({ status: false, msg: "No Data!", channelData: result })
            }

        } else {
            return res.status(200).json({ status: false, msg: "No Data", channelData: null });
        }
    } else {
        return res.status(200).json({ msg: "DB is not created ! Ask to Admin !", channelData: null });
    }
};

/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////

exports.unFollowChannel = async (req, res) => {
    const { curUser, channelName, aboutChannel, handleUrl, location, tags, url, photo, userEmail } = req.body;

    if (channelDB != undefined) {
        const allChannels = channelDB.all;
        const channelData = Object.values(allChannels);
        if (channelData.length > 0) {
            let channelExist = false;
            let result;
            let curFollowers;
            let curContents;
            let id;
            let targetFollwers;

            for (var i = 0; i < channelData.length; i++) {
                if (channelData[i]["email"] == userEmail) {
                    id = i;
                    channelExist = true;
                    curFollowers = channelData[i]["followers"];
                    curContents = channelData[i]["contents"];
                }
            }
            targetFollwers = Object.values(curFollowers);

            if (targetFollwers.includes(curUser)) {
                const id = targetFollwers.indexOf(curUser);
                targetFollwers.splice(id, 1);
            }

            if (channelExist) {
                await channelDB.set(id, {
                    channelName: channelName,
                    email: userEmail,
                    handleUrl: handleUrl,
                    aboutChannel: aboutChannel,
                    tags: tags,
                    location: location,
                    url: url,
                    photo: photo,
                    followers: targetFollwers,
                    contents: curContents
                });
                result = await channelDB.get(id);
                return res.status(200).json({ status: true, msg: "success!", channelData: result })
            } else {
                return res.status(200).json({ status: false, msg: "No Data!", channelData: result })
            }

        } else {
            return res.status(200).json({ status: false, msg: "No Data", channelData: null });
        }
    } else {
        return res.status(200).json({ msg: "DB is not created ! Ask to Admin !", channelData: null });
    }
};

/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////

exports.uploadContentsChannel = async (req, res) => {
    const { file } = req;
    const { title, description, keywords, category, userEmail, video_src, channelAdmin, channelName, status } = req.body;

    if (file) {
        const uploadContentsChannel = exec(`ipfs add ./thumbnail/${file.filename}`);

        uploadContentsChannel.stdout.on('data', async function (result) {
            if (result && result.indexOf('added') >= 0) {
                const hashCode = result.split(' ')[1];
                const stats = await fs.statSync(`./thumbnail/${file.filename}`);
                const size = filesize(stats.size).human('si');
                const data = {
                    filename: file.filename,
                    sourceType: 'file',
                    createdAt: (Date.now()).toString(),
                    ipfsUrl: process.env.IPFS_BASE_URL + hashCode,
                    hashCode: hashCode,
                    size: size,
                }

                if (channelDB != undefined) {
                    const allChannels = channelDB.all;
                    const channelData = Object.values(allChannels);
                    if (channelData.length > 0) {
                        let channelExist = false;
                        let result;
                        let curFollowers;
                        let curContents;
                        let id;
                        let targetContents;

                        let handleUrl;
                        let aboutChannel;
                        let tags;
                        let location;
                        let url;
                        let photo;

                        for (var i = 0; i < channelData.length; i++) {
                            if (channelData[i]["email"] == channelAdmin && channelData[i]["channelName"] == channelName) {
                                id = i;
                                channelExist = true;

                                handleUrl = channelData[i]["handleUrl"];
                                aboutChannel = channelData[i]["aboutChannel"];
                                tags = channelData[i]["tags"];
                                location = channelData[i]["location"];
                                url = channelData[i]["url"];
                                photo = channelData[i]["photo"];
                                curFollowers = channelData[i]["followers"];
                                curContents = channelData[i]["contents"];
                            }
                        }
                        targetContents = Object.values(curContents);
                        let newdata = {
                            ID: targetContents.length,
                            email: userEmail,
                            title: title,
                            description: description,
                            keyword: keywords,
                            category: category,
                            ipfsUrl: video_src,
                            thumbnail: data.ipfsUrl,
                            status: status,
                            liked: 0,
                            disliked: 0,
                            watched: 0,
                            shared: 0,
                            postDate: new Date(),
                            comments: {},
                            followers: []
                        };

                        targetContents.push(newdata);

                        if (channelExist) {
                            await channelDB.set(id, {
                                channelName: channelName,
                                email: channelAdmin,
                                handleUrl: handleUrl,
                                aboutChannel: aboutChannel,
                                tags: tags,
                                location: location,
                                url: url,
                                photo: photo,
                                followers: curFollowers,
                                contents: targetContents
                            });
                            result = await channelDB.get(id);
                            return res.status(200).json({ status: true, msg: "success!", channelData: result })
                        } else {
                            return res.status(200).json({ status: false, msg: "No Data!", channelData: result })
                        }

                    } else {
                        return res.status(200).json({ status: false, msg: "No Data", channelData: null });
                    }
                } else {
                    return res.status(200).json({ msg: "DB is not created ! Ask to Admin !", channelData: null });
                }
            }
        });
    } else {
        return res.json({
            result: false,
            data: "No Thumbnail file"
        });
    }

};

/////////////////////////////////////////////////////////////////////////
/////////////////////// Save History ////////////////////////////////////

exports.createPlaylist = async (req, res) => {
    const { file } = req;
    const { userEmail, playlistTitle, playlistDescription } = req.body;
    if (file) {
        const addPhotoProcess = exec(`ipfs add ./playlists/${file.filename}`);

        addPhotoProcess.stdout.on('data', async function (result) {
            if (result && result.indexOf('added') >= 0) {
                const hashCode = result.split(' ')[1];
                const stats = await fs.statSync(`./playlists/${file.filename}`);
                const size = filesize(stats.size).human('si');
                const data = {
                    filename: file.filename,
                    sourceType: 'file',
                    createdAt: (Date.now()).toString(),
                    ipfsUrl: process.env.IPFS_BASE_URL + hashCode,
                    hashCode: hashCode,
                    size: size,
                }
                if (playlistDB != undefined) {
                    const curPlaylists = playlistDB.all;

                    let playlistsTable = Object.values(curPlaylists);
                    if (playlistsTable.length > 0) {

                        let playlistExist = false;

                        for (var i = 0; i < playlistsTable.length; i++) {
                            if (playlistsTable[i]["userEmail"] == userEmail && playlistsTable[i]["title"] == playlistTitle) {
                                playlistExist = true;
                            }
                        }

                        if (playlistExist) {
                            return res.status(200).json({ msg: `PlayList name is not unique. Choose another name!`, status: false });
                        } else {
                            let id = playlistsTable.length;

                            await playlistDB.set(id, { userEmail: userEmail, feeds: [], image: data.ipfsUrl, title: playlistTitle, description: playlistDescription, createdDate: new Date() });
                            return res.status(200).json({ msg: `Creating playlist is success!`, status: true });
                        }

                    } else {
                        await playlistDB.set(0, { userEmail: userEmail, feeds: [], image: data.ipfsUrl, title: playlistTitle, description: playlistDescription, createdDate: new Date() });
                        return res.status(200).json({ msg: `Creating playlist is successful!`, status: true });
                    }
                } else {
                    return res.status(200).json({ msg: "DB is not created ! Ask to Admin !", status: false });
                }
            }
        });
    } else {
        return res.json({
            result: false,
            data: "No photo file"
        });
    }
};

/////////////////////////////////////////////////////////////////////////
/////////////////////// Save History ////////////////////////////////////

exports.removePlaylist = async (req, res) => {
    // const hash = await db.del('hello');
    const { userEmail, playlistTitle } = req.body;
    if (playlistDB != undefined) {


        const curPlaylists = playlistDB.all;

        let playlistsTable = Object.values(curPlaylists);
        if (playlistsTable.length > 0) {

            let playlistExist = false;

            let resultKey;

            for (var i = 0; i < playlistsTable.length; i++) {
                if (playlistsTable[i]["userEmail"] == userEmail && playlistsTable[i]["title"] == playlistTitle) {
                    playlistExist = true;
                    resultKey = i;
                }
            }

            if (playlistExist) {
                await playlistDB.del(resultKey);
                return res.status(200).json({ msg: `Success Deleted!`, status: true });
            } else {
                return res.status(200).json({ msg: `The Playlist is not existing !`, status: false });
            }

        } else {
            return res.status(200).json({ msg: `The Playlist is not existing  !`, status: false });
        }
    } else {
        return res.status(200).json({ msg: "DB is not created ! Ask to Admin !", status: false });
    }
};

/////////////////////////////////////////////////////////////////////////
/////////////////////// Save History ////////////////////////////////////

exports.getPlaylist = async (req, res) => {
    if (playlistDB != undefined) {
        const curPlaylists = playlistDB.all;
        const PlaylistData = Object.values(curPlaylists);

        return res.status(200).json({ PlaylistData: PlaylistData });
    } else {
        return res.status(200).json({ msg: "DB is not created ! Ask to Admin !", PlaylistData: null });
    }
};

/////////////////////////////////////////////////////////////////////////
/////////////////////// Save History ////////////////////////////////////

exports.addVideoToPlaylist = async (req, res) => {
    const { userEmail,
        playlistTitle,
        creatorEmail,
        ID,
        title,
        description,
        keywords,
        category,
        video_src,
        thumbnail,
        status,
        postDate,
        liked,
        shared,
        disliked,
        watched,
        comments,
        followers } = req.body;

    if (playlistDB != undefined) {

        let playlistID = 0;
        const curPlaylists = playlistDB.all;
        let playlistsTable = Object.values(curPlaylists);

        if (playlistsTable.length > 0) {

            let playlistExist = false;
            let curFeeds;
            let targetFeeds;

            let playlist_title;
            let playlist_description;
            let playlist_image;
            let playlist_date;

            for (var i = 0; i < playlistsTable.length; i++) {
                if (playlistsTable[i]["userEmail"] == userEmail && playlistsTable[i]["title"] == playlistTitle) {
                    playlistExist = true;
                    playlist_title = playlistsTable[i]["title"];
                    playlist_description = playlistsTable[i]["description"];
                    playlist_image = playlistsTable[i]["image"];
                    playlist_date = playlistsTable[i]["createdDate"];
                    curFeeds = playlistsTable[i]["feeds"];
                    playlistID = i;
                }
            }

            targetFeeds = Object.values(curFeeds);

            let newdata = {
                ID: ID,
                email: creatorEmail,
                title: title,
                description: description,
                keyword: keywords,
                category: category,
                ipfsUrl: video_src,
                thumbnail: thumbnail,
                status: status,
                postDate: postDate,
                liked: liked,
                disliked: disliked,
                watched: watched,
                shared: shared,
                postDate: postDate,
                comments: comments,
                followers: followers
            };

            targetFeeds.push(newdata);


            if (playlistExist) {
                await playlistDB.set(playlistID, {
                    userEmail: userEmail,
                    feeds: targetFeeds,
                    image: playlist_image,
                    title: playlist_title,
                    description: playlist_description,
                    createdDate: playlist_date
                });

                result = await channelDB.get(playlistID);
                return res.status(200).json({ msg: `Success Added!`, status: true, playListData: result });
            } else {
                return res.status(200).json({ msg: `The Playlist is not existing !`, status: false });
            }

        } else {
            return res.status(200).json({ msg: `The Playlist is not existing  !`, status: false });
        }

    } else {
        return res.status(200).json({ msg: "DB is not created ! Ask to Admin !", PlaylistData: null });
    }
};

/////////////////////////////////////////////////////////////////////////
/////////////////////// Save History ////////////////////////////////////

exports.removeVideoToPlaylist = async (req, res) => {
    const { userEmail, playlistTitle, ID } = req.body;

    if (playlistDB != undefined) {

        let playlistID = 0;
        const curPlaylists = playlistDB.all;
        let playlistsTable = Object.values(curPlaylists);

        if (playlistsTable.length > 0) {

            let playlistExist = false;
            let curFeeds;
            let targetFeeds;

            let playlist_title;
            let playlist_description;
            let playlist_image;
            let playlist_date;

            for (var i = 0; i < playlistsTable.length; i++) {
                if (playlistsTable[i]["userEmail"] == userEmail && playlistsTable[i]["title"] == playlistTitle) {
                    playlistExist = true;
                    playlist_title = playlistsTable[i]["title"];
                    playlist_description = playlistsTable[i]["description"];
                    playlist_image = playlistsTable[i]["image"];
                    playlist_date = playlistsTable[i]["createdDate"];
                    playlistID = i;
                    curFeeds = playlistsTable[i]["feeds"];
                }
            }

            targetFeeds = Object.values(curFeeds);

            let resultFeeds = targetFeeds.filter(obj => obj["ID"] !== ID);

            if (playlistExist) {
                await playlistDB.set(playlistID, {
                    userEmail: userEmail,
                    feeds: resultFeeds,
                    image: playlist_image,
                    title: playlist_title,
                    description: playlist_description,
                    createdDate: playlist_date
                });

                result = await channelDB.get(playlistID);
                return res.status(200).json({ msg: `Success Deleted!`, status: true, playListData: result });
            } else {
                return res.status(200).json({ msg: `The Playlist is not existing !`, status: false });
            }

        } else {
            return res.status(200).json({ msg: `The Playlist is not existing  !`, status: false });
        }

    } else {
        return res.status(200).json({ msg: "DB is not created ! Ask to Admin !", PlaylistData: null });
    }
};

/////////////////////////////////////////////////////////////////////////
/////////////////////// Save History ////////////////////////////////////

exports.getAllVideoFromPlaylist = async (req, res) => {
    const { userEmail, playlistTitle } = req.body;

    if (playlistDB != undefined) {
        const curPlaylists = playlistDB.all;
        const PlaylistData = Object.values(curPlaylists);
        if (PlaylistData.length > 0) {
            let playlistExist = false;

            let resultFeeds;

            for (var i = 0; i < playlistsTable.length; i++) {
                if (PlaylistData[i]["userEmail"] == userEmail && PlaylistData[i]["title"] == playlistTitle) {
                    playlistExist = true;
                    resultFeeds = PlaylistData[i]["feeds"]
                }
            }

            if (playlistExist) {
                return res.status(200).json({ msg: "Success !", PlaylistData: resultFeeds, status: true });
            } else {
                return res.status(200).json({ msg: "There is no Playlists !", PlaylistData: null, status: false });
            }
        } else {
            return res.status(200).json({ msg: "Playlist is not created ! Ask to Admin !", PlaylistData: null, status: false });
        }
    } else {
        return res.status(200).json({ msg: "DB is not created ! Ask to Admin !", PlaylistData: null, status: false });
    }
};
