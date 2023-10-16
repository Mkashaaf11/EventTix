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

router.get("/", (req, res) => {
  res.render("seller/main");
});

router.post("/signup", (req, res) => {
  res.render("seller/signup");
});

router.get("/login", (req, res) => {
  res.render("seller/login");
});

router.post("/login", (req, res) => {
  res.render("seller/login");
});

router.get("/dashboard", (req, res) => {
  //shop detail etc
  res.render("seller/dashboard");
});

router.get("/items", (req, res) => {
  //view items
  res.render("seller/items");
});

router.post("/items", (req, res) => {
  //add items
  res.render("seller/items");
});

router.put("/items/:id", (req, res) => {
  //update items
  res.render("seller/items");
});

router.delete("/items/:id", (req, res) => {
  //delete items
  res.render("seller/items");
});

router.get("/profile", (req, res) => {
  //see profile
  res.render("seller/profile");
});

router.post("/profile", (req, res) => {
  //update profile
  res.render("seller/profile");
});

router.get("/logout", (req, res) => {
  res.render("seller/logout");
});

module.exports = router;
