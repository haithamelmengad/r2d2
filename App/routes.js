// This file uses express middleware as a server, path to join directory path to relative path
// bodyParser to receive parsed request data request.body object
// fs to read external data (from the data folder)
// csv parser to parse the external data 

import express from "express";
import path from "path";
import bodyParser from "body-parser";
import fs from "fs";

const router = express();

// Join directory path to public folder to set static path to this file
// Use body parser and defines data format (url encoded) for http protocol
// router.use(express.static(path.join(__dirname, "../public")));
router.use(bodyParser.urlencoded({
	extended: true
}));

module.exports = router;