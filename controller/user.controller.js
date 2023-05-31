require('dotenv').config();
const jwt = require('jsonwebtoken');
const Messages = require('../config/messages.js');
const path = require('path');
const fs = require("fs");

/////////////////////////////////////////////////////////////////////////
////////////////////////// Check Token //////////////////////////////////
/////////////////////////////////////////////////////////////////////////
async function checkAuth(req, res) {
  const { token } = req.body
  if(!token) {
    return res.status(401).send({
      status: false
    })
  }
  let decoded;
  try {
    decoded = jwt.decode(token, process.env.JWT_SECRET);
    if (decoded.id == process.env.ADMIN_EMAIL) {
      res.json({
        result: true,
        user: {email: process.env.ADMIN_EMAIL},
        token
      });
    }
  } catch(error) {
    return res.status(401).send({
      status: false
    })
  }
};

/////////////////////////////////////////////////////////////////////////
///////////////////////////// Login /////////////////////////////////////
/////////////////////////////////////////////////////////////////////////
async function login(req, res) {
  const { email, password } = req.body;

  if (email == process.env.ADMIN_EMAIL) {
    if (password == process.env.ADMIN_PASS) {
      // Generate Token.
      const token = jwt.sign({id: email}, process.env.JWT_SECRET, {});
      res.json({
        result: true,
        user: {email: process.env.ADMIN_EMAIL},
        token
      });
      return;
    } else {
      res.json({
        result: false,
        error: Messages.INCORRECT_PASSWORD
      });
    }
  } else {
    res.json({
      result: false,
      error: Messages.ACCOUNT_NOT_EXIST
    });
  }
};

/////////////////////////////////////////////////////////////////////////
///////////////////////////// Preview ///////////////////////////////////
/////////////////////////////////////////////////////////////////////////
async function preview(req, res) {
  const { url, backup_url } = req.query;
  let html = fs.readFileSync('./templates/preview.html', 'utf8');
  html = html.replace('{{url}}', url);
  html = html.replace('{{backup_url}}', backup_url);
  res.send(html);
};

module.exports = {
  checkAuth,
  login,
  preview
}
