require('dotenv').config();
const qs = require('qs');
const axios = require('axios');
const Config = require("../config/config");
const Messages = require("../config/messages");
const moment = require('moment-timezone');
const fs = require('fs');
const ytdl = require('ytdl-core');
const vidl = require('vimeo-downloader');
const youtubedl = require('youtube-dl-exec')
const { exec } = require('node:child_process');
const filesize = require("file-size");
const requestIp = require('request-ip');
const History = require('../models/history.model');

const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_KEY);

let converting = [];
let hashHistories = [];
let tokens = [];

/////////////////////////////////////////////////////////////////////////
/////////////////////// Generate IPFS ///////////////////////////////////
/////////////////////////////////////////////////////////////////////////
async function generateIPFS(req, res) {
  const { url, timestamp, email, token } = req.body;
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
/////////////////////// Get Processing //////////////////////////////////
/////////////////////////////////////////////////////////////////////////
async function getProcessing(req, res) {
  const { timestamp } = req.body;
  console.log('get processing ========>', timestamp);
  const index = converting.findIndex((item) => item && item.timestamp === timestamp);
  if (index >= 0) {
    return res.json({
      result: true,
      data: converting[index].percent
    });
  }
  return res.json({
    result: false,
    error: ''
  });
};

/////////////////////////////////////////////////////////////////////////
/////////////////////// Get Histories ///////////////////////////////////
/////////////////////////////////////////////////////////////////////////
async function getHistories(req, res) {
  let histories = [];

  for (let i = 0; i < hashHistories.length; i++) {
    const jsonData = await axios({
      method: 'get',
      url: `${process.env.IPFS_BASE_URL}/${hashHistories[i].jsonHashCode}`
    }).catch((err) => {
      console.log('get history error ========>', hashHistories[i]);
    });
    if (jsonData && jsonData.data) {
      histories.push(jsonData.data);
    }
  }
  return res.json({
    result: true,
    data: histories
  });
};

/////////////////////////////////////////////////////////////////////////
/////////////////////// Get History By Hash /////////////////////////////
/////////////////////////////////////////////////////////////////////////
async function getHistoryByHash(req, res) {
  const { hashCode } = req.body;

  let histories = [];
  for (let i = 0; i < hashHistories.length; i++) {
    const jsonData = await axios({
      method: 'get',
      url: `${process.env.IPFS_BASE_URL}/${hashHistories[i].jsonHashCode}`
    }).catch((err) => {
      console.log('get history error ========>', hashHistories[i]);
    });
    if (jsonData && jsonData.data) {
      histories.push(jsonData.data);
    }
  }

  const index = histories.findIndex((item) => item.hashCode == hashCode);
  if (index >= 0) {
    return res.json({
      result: true,
      data: histories[index]
    });
  } else {
    return res.json({
      result: false,
    });
  }
};

/////////////////////////////////////////////////////////////////////////
/////////////////////// Check Upload Overflow ///////////////////////////
/////////////////////////////////////////////////////////////////////////
async function checkUploadOverflow(req, res) {
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
  const times = histories.filter((item) => item.ip == ip);
  if (times.length >= 5) {
    return res.json({
      result: true,
    });
  }
  return res.json({
    result: false,
  });
};

/////////////////////////////////////////////////////////////////////////
/////////////////////// Remove History //////////////////////////////////
/////////////////////////////////////////////////////////////////////////
async function removeHistory(req, res) {
  const { hashCode } = req.body;
  await History.deleteOne({ hashCode });

  const index = hashHistories.findIndex((item) => item.hashCode == hashCode);
  if (index >= 0) {
    const jsonData = await axios({
      method: 'get',
      url: `${process.env.IPFS_BASE_URL}/${hashHistories[index].jsonHashCode}`
    }).catch((err) => {
      console.log('get history error ========>', hashHistories[index]);
    });
    if (jsonData && jsonData.data) {
      const video_filename = jsonData.data.filename;
      const json_filename = jsonData.data.filename.replace('.mp4', '.json');
      const removeVideoProcess = exec(`rm -rf ./downloads/${video_filename}`);
      const removeJSONProcess = exec(`rm -rf ./downloads/${json_filename}`);
    }
    hashHistories.splice(index, 1);
  }
  return res.json({
    result: true,
  });
};

/////////////////////////////////////////////////////////////////////////
/////////////////////// Confirm Email  //////////////////////////////////
/////////////////////////////////////////////////////////////////////////
async function confirmEmail(req, res) {
  const { email, url } = req.body;
  let html = fs.readFileSync('./templates/confirm_email.html', 'utf8');
  const token = makeToken(20);
  tokens.push({
    token,
    url,
    timestamp: Date.now()
  });
  const link = `${process.env.SITE_URL}/?token=${token}`;
  const regex = new RegExp('confirm_link', 'gi');
  html = html.replace(regex, link);
  const msg = {
    to: email,
    from: 'john@tempconnect.app',
    subject: 'UpSocial Confirm Email',
    html,
  };

  sgMail.send(msg).then((sent) => {
    return res.json({
      result: true,
    });
  }).catch((err) => {
    return res.json({
      result: false,
      error: err
    });
  });
};


/////////////////////////////////////////////////////////////////////////
/////////////////////// Check Token  ////////////////////////////////////
/////////////////////////////////////////////////////////////////////////
async function checkToken(req, res) {
  const { token } = req.body;
  const index = tokens.findIndex((item) => item.token == token);
  if (index >= 0) {
    const diff = moment.duration(moment().diff(tokens[index].timestamp)).minutes();
    if (diff >= 2) {
      return res.json({
        result: false,
        error: 'Token is expired.'
      })
    }
    return res.json({
      result: true,
      data: tokens[index].url
    });
  }
  return res.json({
    result: false,
    error: 'Token is invalid'
  });
};

/////////////////////////////////////////////////////////////////////////
/////////////////////// Upload Video (API call)  ////////////////////////
/////////////////////////////////////////////////////////////////////////
async function uploadVideo(req, res) {
  const { url } = req.query;
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

  let userHistories = histories.filter((item) => item.ip == ip);
  if (userHistories.length > 0) {
    userHistories = userHistories.sort((a, b) => a.createdAt > b.createdAt ? 1 : -1);
    const lastUploadAt = Number(userHistories[userHistories.length - 1].createdAt);
    const limit = moment(lastUploadAt).add(5, 'minutes');
    if (limit > moment()) {
      const estimate = moment.duration(limit.diff(moment()));
      return res.status(400).json({ error: `Please try again after ${estimate.minutes()} minutes.` });
      // return res.json({
      //   result: false,
      //   error: `Please try again after ${estimate.minutes()} minutes.`
      // });
    }
  }

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

  const downloadProcess = exec(`yt-dlp -o ./downloads/${videoId}.mp4 "${url}" -f "mp4"`);
  downloadProcess.stderr.on('data', function (err) {
    if (err && err.includes('WARNING') < 0) {
      console.log('download error =========>', err);
      return res.status(400).json({ error: err });
      // return res.json({
      //   result: false,
      //   error: err
      // });
    }
  });
  downloadProcess.stdout.on('data', async function (data) {
    console.log('downloading =========>', data, converting);
    if (data && data.indexOf('has already been downloaded') >= 0) {
      console.log('download success 222 **********>' + `${videoId}.mp4`);
      const index = userHistories.findIndex((item) => item.filename == `${videoId}.mp4`);
      if (index >= 0) {
        return res.status(200).json({ data: userHistories[index] });
        // return res.json({
        //   result: true,
        //   data: userHistories[index]
        // });
      }
    } else if (data.indexOf('100%') >= 0) {
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
              email: ""
            }
            saveHistory(data);
            return res.status(200).json({ data: data });
            // return res.json({
            //   result: true,
            //   data: data
            // });
          }
        });
      }, 500);
    }
  });
};


/////////////////////////////////////////////////////////////////////////
/////////////////////// Restore History /////////////////////////////////
/////////////////////////////////////////////////////////////////////////
async function restoreHistory() {
  const histories = await History.find({});
  if (histories && histories.length > 0) {
    for (const history of histories) {
      hashHistories.push({
        hashCode: history._doc.hashCode,
        jsonHashCode: history._doc.jsonHashCode
      });
    }
  }
  console.log('restore history =======>', hashHistories);
};


/////////////////////////////////////////////////////////////////////////
/////////////////////// Get History /////////////////////////////////////
/////////////////////////////////////////////////////////////////////////
async function getHistory(url) {
  for (let i = 0; i < hashHistories.length; i++) {
    const jsonData = await axios({
      method: 'get',
      url: `${process.env.IPFS_BASE_URL}/${hashHistories[i].jsonHashCode}`
    });
    if (jsonData && jsonData.data.url === url) {
      return jsonData;
    }
  }
  return null;
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

function makeToken(length) {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
}


module.exports = {
  generateIPFS,
  getProcessing,
  getHistories,
  getHistoryByHash,
  checkUploadOverflow,
  restoreHistory,
  removeHistory,
  confirmEmail,
  uploadVideo,
  checkToken
};
