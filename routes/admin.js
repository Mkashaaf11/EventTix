const bcrypt = require("bcrypt");
const express = require("express");
const router = express.Router();
const mysql = require("mysql");

const connection = mysql.createConnection({
  host: "localhost",
  user: "your_db_user",
  password: "your_db_password",
  database: "your_database",
});

module.exports = router;
