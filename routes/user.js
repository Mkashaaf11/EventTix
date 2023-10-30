const bcrypt = require("bcrypt");
const express = require("express");
const router = express.Router();
const mysql = require("../db");

const User = require("../models/user");
const { isEmail, isLength } = require("validator");

router.get("/", ensureAuthenticated, (req, res) => {
  const sql = "SELECT sellerId,name FROM seller order by sellerId asc";
  mysql.query(sql, (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send("Error getting sellers");
    } else if (result.length > 0) {
      const shops = result;
      res.render("user/main", { shops: shops });
    } else {
      req.send("No shop available");
    }
  });
});

router.get("/signup", (req, res) => {
  res.render("user/signup");
});

// User registration (Signup)
router.post("/signup", (req, res) => {
  try {
    // Your route handling logic here
    const userName = req.body.username;
    const password = req.body.password;
    const email = req.body.email;

    if (!isEmail(email) || !isLength(password, { min: 8 })) {
      res.status(400).send("Invalid email or password.");
      return;
    }
    //validation
    const newUser = new User(userName, email, password);
    const sql =
      "INSERT INTO users (username, email, password) VALUES (?, ?, ?)";

    const hashedPassword = bcrypt.hashSync(password, 10);
    // Execute the query
    mysql.query(
      sql,
      [newUser.username, newUser.email, hashedPassword],
      // [newUser.username, newUser.email, newUser.password],
      (err, results) => {
        if (err) {
          console.error(err);
          res.status(500).send("Error creating user.Check username uniqueness");
        } else {
          // User registration successful
          res.redirect("/user/login");
        }
      }
    );
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/login", (req, res) => {
  res.render("user/login");
});

// User authentication (Login)
router.post("/login", (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  // Retrieve user data from the database based on the provided username
  const sql = "SELECT * FROM users WHERE username = ?";
  mysql.query(sql, [username], (err, results) => {
    if (err) {
      console.error(err);
      req.flash("error", "Error authenticating user.Server Error");
      res.redirect("/user/login");
    } else if (results.length > 0) {
      // User found, compare hashed passwords
      const user = results[0];
      if (bcrypt.compareSync(password, user.password)) {
        // Passwords match, login successful
        req.session.user = user; // using Express sessions
        res.redirect("/user/dashboard"); // Redirect to the user's dashboard
      } else {
        // Passwords do not match
        req.flash("error", "Incorrect Password");
        res.redirect("/user/login");
      }
    } else {
      // User not found
      req.flash("error", "user not found");
      res.redirect("/user/signup");
    }
  });
});

router.get("/profile", ensureAuthenticated, (req, res) => {
  const user = req.session.user;
  res.render("user/profile", { user });
});

router.get("/dashboard", ensureAuthenticated, (req, res) => {
  const user = req.session.user;
  res.render("user/dashboard", { user });
});

router.get("/logout", (req, res) => {
  //res.render("user/logout");
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
    }
    res.redirect("/user/login"); // Redirect to the login page after signing out
  });
});

router.get("/shop/:id", (req, res) => {
  const sql = "SELECT itemName,price FROM item WHERE sellerId = ?";
  const id = req.params.id;
  mysql.query(sql, [id], (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).send("Error authenticating user");
    } else if (results.length > 0) {
      const items = results;

      res.render("user/showitems", { items: items });
    } else {
      res.send("No item found");
    }
  });
});
function isUsernameUnique(username) {
  // Implement username uniqueness check against the database
  // Return true if the username is unique, otherwise false
  // You can perform a SELECT query to check for existing usernames
  return true; // Replace with actalu database check
}

function ensureAuthenticated(req, res, next) {
  if (req.session.user) {
    return next(); // User is authenticated, proceed to the route
  }
  res.redirect("/user/login"); // Redirect to the login page if not authenticated
}

module.exports = router;
