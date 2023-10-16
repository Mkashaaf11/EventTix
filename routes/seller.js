const bcrypt = require("bcrypt");
const express = require("express");
const router = express.Router();
const mysql = require("../db");
const Seller = require("../models/seller");
const { isEmail, isLength } = require("validator");

router.get("/", (req, res) => {
  res.render("seller/main");
});

router.get("/signup", (req, res) => {
  res.render("seller/signup");
});
router.post("/signup", (req, res) => {
  try {
    const name = req.body.name;
    const userName = req.body.username;
    const email = req.body.email;
    const password = req.body.password;
    if (!isEmail(email) || !isLength(password, { min: 8 })) {
      res.status(400).send("Invalid Email or Password");
      return;
    }

    const newSeller = new Seller(name, userName, email, password);
    const sql =
      "INSERT INTO seller(name,email,username,password) VALUES (?,?,?,?)";
    const hashedPassword = bcrypt.hashSync(password, 10);
    mysql.query(
      sql,
      [newSeller.name, newSeller.email, newSeller.username, hashedPassword],
      (err, results) => {
        if (err) {
          console.error(err);
          res
            .status(500)
            .send("Error creating seller.Check username uniqueness");
        } else {
          // seller registration successful
          res.redirect("/seller/login");
        }
      }
    );
  } catch (error) {}
  //res.render("seller/signup");
});

router.get("/login", (req, res) => {
  res.render("seller/login");
});

router.post("/login", (req, res) => {
  const userName = req.body.username;
  const password = req.body.password;
  const sql = "SELECT * FROM seller WHERE username = ?";
  mysql.query(sql, [userName], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send("Error Authenticating seller");
    } else if (result.length > 0) {
      const seller = result[0];
      if (bcrypt.compareSync(password, seller.password)) {
        req.session.seller = seller;
        res.redirect("/seller/dashboard");
      } else {
        res.status(401).send("Password donot match");
      }
    } else {
      res.status(401).send("User not found");
    }
  });
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
