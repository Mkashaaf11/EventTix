const bcrypt = require("bcrypt");
const express = require("express");
const router = express.Router();
const mysql = require("../db");
const e = require("express");

router.get("/", ensureAuthenticated, (req, res) => {
  res.render("admin/dashboard");
});

router.get("/login", (req, res) => {
  res.render("admin/login");
});

router.post("/login", (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  const sql = `SELECT * FROM admin WHERE username = ? `;
  mysql.query(sql, [username], (err, result) => {
    if (err) {
      req.flash("error", "server Error in admin");
      res.redirect("/admin/login");
    } else if (result.length > 0) {
      if (password === result[0].password) {
        const admin = result[0];
        req.flash("success", "Login sucesfull for admin");
        req.session.admin = admin;
        res.redirect("/admin");
      } else {
        req.flash("error", "Passowrd Doesnt match try again");
        res.redirect("/admin/login");
      }
    } else {
      req.flash("error", "Username is incorrect. try again");
      res.redirect("/admin/login");
    }
  });
});

router.get("/viewUsers", ensureAuthenticated, (req, res) => {
  const sql = `SELECT u.id,u.username,u.email,u.age,c.cityName FROM users u INNER JOIN city c on u.cityId=c.cityId`;
  mysql.query(sql, (err, result) => {
    if (err) {
      req.flash("error", "server error");
      res.redirect("/admin");
    } else if (result.length > 0) {
      const users = result;
      res.render("admin/showUsers", { users: users });
    } else {
      req.flash("error", "No user exist. We are looking over the issue");
      res.redirect("/admin");
    }
  });
});

router.get("/viewOrg", ensureAuthenticated, (req, res) => {
  const sql = `SELECT orgID,name,username,email FROM organization`;
  mysql.query(sql, (err, result) => {
    if (err) {
      req.flash("error", "server error");
      res.redirect("/admin");
    } else if (result.length > 0) {
      const org = result;
      res.render("admin/showOrg", { org: org });
    } else {
      req.flash(
        "error",
        "No organization exist. We are looking over the issue"
      );
      res.redirect("/admin");
    }
  });
});

router.get("/restrictUser/:id", (req, res) => {
  const id = req.params.id;
  const sql = `SELECT email FROM users WHERE id=?`;
  mysql.query(sql, [id], (err, result) => {
    if (err) {
      req.flash("error", "Server error while user restriction");
      res.redirect("/admin/viewUsers");
    } else if (result.length > 0) {
      const email = result[0];
      const adminSql = `INSERT INTO restrictor(email) VALUE(email)`;
      mysql.query(adminSql, (err, result) => {
        if (err) {
          req.flash("error", "Server error while inserting in restrictor");
          res.redirect("/admin/viewUsers");
        } else {
          req.flash("success", "User restricted succesfully");
          res.redirect("/admin/viewUsers");
        }
      });
    } else {
      req.flash("error", "Cant Find User in Database");
      res.redirect("/admin/viewUsers");
    }
  });
});

router.get("/restrictOrg/:id", (req, res) => {
  const id = req.params.id;
  const sql = `SELECT email FROM organization WHERE id=?`;
  mysql.query(sql, [id], (err, result) => {
    if (err) {
      req.flash("error", "Server error while organization restriction");
      res.redirect("/admin/viewOrg");
    } else if (result.length > 0) {
      const email = result[0];
      const adminSql = `INSERT INTO restrictor(email) VALUE(email)`;
      mysql.query(adminSql, (err, result) => {
        if (err) {
          req.flash("error", "Server error while inserting in restrictor");
          res.redirect("/admin/viewOrg");
        } else {
          req.flash("success", "organiation restricted succesfully");
          res.redirect("/admin/viewOrg");
        }
      });
    } else {
      req.flash("error", "Cant Find organization in Database");
      res.redirect("/admin/viewOrg");
    }
  });
});
router.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
    }
    res.redirect("/"); // Redirect to the login page after signing out
  });
});

function ensureAuthenticated(req, res, next) {
  if (req.session.admin) {
    return next();
  }
  res.redirect("/admin/login");
}
module.exports = router;
