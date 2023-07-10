require("dotenv").config();
var express = require("express");
const app = express();
var cookieParser = require("cookie-parser");
var jwt = require("jsonwebtoken");

app.use(cookieParser());

const auth = (req, res, next) => {
    try{
        const token = req.headers.cookie.split('=')[1];
        const verifyUser = jwt.verify(token, process.env.JWT_KEY);
        req.account = verifyUser.username;
        next();
    }catch(err){
        console.log(err);
        res.status(401).send('Incorrect Token');
    }
}

module.exports = auth