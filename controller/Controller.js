require('dotenv').config();
const OrbitDB = require("orbit-db");
const axios = require('axios');
const IPFS = require("ipfs");
const { exec } = require('node:child_process');
const fs = require('fs');
const filesize = require("file-size");
const { encryptString, decryptString } = require('encrypt-string');

let ipfs;
let orbitdb;


let userDataDB; // User Profile Database
let contentDB; // Content Management Database

let hashHistories = [];

let ENCRYPT_PASS = process.env.ENCRYPT_PASS;
/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////

exports.CreateDBs = async (req, res) => {
    if (userDataDB == undefined && contentDB == undefined) {
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
        return res.status(200).json({ msg: "You have to Create DB ! Ask to Admin !", userData: null });
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
                await userDataDB.put(userId, { username: username, email: email, password: encrypted_password, status: true });
                return res.status(200).json({ msg: `${email} is registered success !`, status: true });
            } else {
                return res.status(200).json({ msg: `${email} is already registered !`, status: false });
            }


        } else {
            await userDataDB.put(userId, { username: username, email: email, password: encrypted_password, status: true });
            return res.status(200).json({ msg: `${email} is registered success !`, status: true });
        }
    } else {
        return res.status(200).json({ msg: "You have to Create DB ! Ask to Admin !" });
    }

};

/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////

exports.userLogin = async (req, res) => {
    const email = req.body.email;
    const password = req.body.password;

    let userId = 0;

    if (userDataDB != undefined) {

        if (userDataDB.get(userId) != undefined) {

            const curUsers = userDataDB.all;

            let userTable = Object.values(curUsers);

            let userAuth = false;

            for (var i = 0; i < userTable.length; i++) {
                if (userTable[i]["email"] == email && userTable[i]["status"]) {
                    const decrypted_password = await decryptString(userTable[i]["password"], ENCRYPT_PASS);
                    if (decrypted_password == password) {
                        userAuth = true;
                    } else {
                        userAuth = false;
                    }
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

            await contentDB.put(contentID, { ID: contentID, email: userEmail, title: title, description: description, keyword: keyword, category: category, ipfsUrl: ipfsUrl, thumbnail: thumbnail, status: status });
            return res.status(200).json({ msg: `uploaded success`, status: true });

        } else {
            await contentDB.put(contentID, { ID: contentID, email: userEmail, title: title, description: description, keyword: keyword, category: category, ipfsUrl: ipfsUrl, thumbnail: thumbnail, status: status });
            return res.status(200).json({ msg: `uploaded success`, status: true });
        }
    } else {
        return res.status(200).json({ msg: "You have to Create DB ! Ask to Admin !" });
    }
};

/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////

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

/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////

exports.GetAllUploadedContent = (req, res) => {
    let start = 0;
    let limit = req.body.limit;
    const contentId = 0;
    if (contentDB != undefined) {

        if (contentDB.get(contentId) != undefined) {
            const allContents = contentDB.all;
            let contentsTable = Object.values(allContents);

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
        return res.status(200).json({ msg: "You have to Create DB ! Ask to Admin !" });
    }
};

/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////

exports.changeUserStatus = async (req, res) => {
    const userEmail = req.body.userEmail;
    const status = req.body.status;
    let userId = 0;
    if (userDataDB != undefined) {

        if (userDataDB.get(userId) != undefined) {

            const curUsers = userDataDB.all;

            let userTable = Object.values(curUsers);

            let userExist = false;
            let username;
            let password;

            for (var i = 0; i < userTable.length; i++) {
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

/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////

exports.changeContentStatus = async (req, res) => {
    const userEmail = req.body.userEmail;
    const contentID = req.body.Id;
    const status = req.body.status;

    if (contentDB != undefined) {

        if (contentDB.get(contentID) != undefined) {
            const data = contentDB.get(contentID);

            await contentDB.set(contentID, { ID: contentID, email: userEmail, title: data.title, description: data.description, keyword: data.keyword, category: data.category, ipfsUrl: data.ipfsUrl, thumbnail: data.thumbnail, status: status });

            return res.status(200).json({ status: true, msg: "success!", data: data })

        } else {
            return res.status(200).json({ status: false, msg: "No Data", data: null });
        }
    } else {
        return res.status(200).json({ msg: "You have to Create DB ! Ask to Admin !" });
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
                saveHistory(data);
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
/////////////////////////////////////////////////////////////////////////
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

function youtube_parser(url) {
    var regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    var match = url.match(regExp);
    return (match && match[7].length == 11) ? match[7] : false;
}

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


exports.uploadPhoto = async (req, res) => {
    const { file } = req;
    const { name, handle, description, location, userEmail } = req.body;
    let data;
    if (file) {
        const addPhotoProcess = exec(`ipfs add ./photos/${file.filename}`);

        addPhotoProcess.stdout.on('data', async function (result) {
            if (result && result.indexOf('added') >= 0) {
                const hashCode = result.split(' ')[1];
                const stats = await fs.statSync(`./photos/${file.filename}`);
                const size = filesize(stats.size).human('si');
                data = {
                    filename: file.filename,
                    sourceType: 'file',
                    createdAt: (Date.now()).toString(),
                    ipfsUrl: process.env.IPFS_BASE_URL + hashCode,
                    hashCode: hashCode,
                    size: size,
                }

                // return res.json({
                //     result: true,
                //     data: data
                // });
            }
        });


        let userId = 0;
        if (userDataDB != undefined) {

            if (userDataDB.get(userId) != undefined) {

                const curUsers = userDataDB.all;

                let userTable = Object.values(curUsers);

                let userExist = false;
                let password;
                let status;

                for (var i = 0; i < userTable.length; i++) {
                    if (userTable[i]["email"] == userEmail) {
                        userId = i;
                        status = userTable[i]["status"];
                        password = userTable[i]["password"];
                        userExist = true;
                    }
                }

                if (!userExist) {
                    return res.status(200).json({ msg: `User is not registered!`, status: false });
                } else {
                    await userDataDB.set(userId, { username: name, email: userEmail, password: password, status: status, handle: handle, description: description, location: location });
                    return res.status(200).json({ msg: `Success!`, status: true, data: data });
                }

            } else {
                return res.status(200).json({ msg: `Saving your profile is change!`, status: false });
            }
        } else {
            return res.status(200).json({ msg: "You have to Create DB ! Ask to Admin !" });
        }
    } else {
        return res.json({
            result: false,
            data: "No photo file"
        });
    }
}