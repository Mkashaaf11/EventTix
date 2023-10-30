const bcrypt = require("bcrypt");
const express = require("express");
const router = express.Router();
const mysql = require("../db");
const Seller = require("../models/seller");
const Item = require("../models/item");
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
      req.flash("error", "Error Authenticating seller");
      res.redirect("/seller/login");
    } else if (result.length > 0) {
      const seller = result[0];
      if (bcrypt.compareSync(password, seller.password)) {
        req.session.seller = seller;
        res.redirect("/seller/dashboard");
      } else {
        req.flash("error", "Password donot match");
        res.redirect("/seller/login");
      }
    } else {
      req.flash("error", "user not found");
      res.redirect("/seller/signup");
    }
  });
});

router.get("/dashboard", ensureAuthenticated, (req, res) => {
  //shop detail etc
  res.render("seller/dashboard");
});

router.get("/items", ensureAuthenticated, (req, res) => {
  //view items
  const sellerID = req.session.seller.sellerID;
  const sql = "SELECT * FROM item WHERE sellerID = ?";
  mysql.query(sql, [sellerID], (err, result) => {
    if (err) {
      console.log(err);
      res.status(500).send("Error Connecting Database");
    } else if (result.length > 0) {
      res.render("seller/item/view", { items: result });
    } else {
      res.status(400).send("No item Exist");
    }
  });
});

router.get("/items/add", ensureAuthenticated, (req, res) => {
  res.render("seller/item/addItem", { session: req.session });
});

router.post("/items/add", (req, res) => {
  //add items
  const itemName = req.body.itemName;
  const price = req.body.price;
  const category = req.body.category;
  const sellerId = req.body.sellerId;
  const sql = "SELECT * FROM seller WHERE sellerID = ? ";
  mysql.query(sql, [sellerId], (err, result) => {
    if (err) {
      console.log(err);
      res.status(500).send("Error Querying database");
    } else if (result.length > 0) {
      const newItem = new Item(itemName, price, category, sellerId);
      const sql =
        "INSERT INTO item(itemName,price,category,sellerId) VALUES (?,?,?,?)";
      mysql.query(
        sql,
        [newItem.itemName, newItem.price, newItem.category, newItem.sellerId],
        (err, result) => {
          if (err) {
            res.status(500).send("Error Querying Database");
          } else {
            res.redirect("/seller/items");
          }
        }
      );
    } else {
      res.status(401).send(`Seller with ${sellerId} doesnt exist.Check again.`);
    }
  });
});

router.get("/items/update/:id", ensureAuthenticated, (req, res) => {
  const itemID = req.params.id;
  const sql = "SELECT * FROM item WHERE itemId = ?";
  mysql.query(sql, [itemID], (err, result) => {
    if (err) {
      res.status(500).send("Error Querying Database for updating");
    } else if (result.length > 0) {
      const item = result[0];
      res.render("seller/item/updateItem", { item });
    } else {
      res.status(401).send(`Item with ${itemID} doesnt exist.Check again`);
    }
  });
});

router.put("/items/update/:id", (req, res) => {
  //update items
  const itemID = req.params.id;
  const itemName = req.body.itemName;
  const price = req.body.price;
  const category = req.body.category;

  // Update the item in the database
  const sql =
    "UPDATE item SET itemName = ?, price = ?, category = ? WHERE itemId = ?";
  mysql.query(sql, [itemName, price, category, itemID], (err, result) => {
    if (err) {
      console.log(err);
      res.status(500).send("Error querying database while updating");
    } else {
      res.redirect("/seller/items");
    }
  });
});

router.delete("/items/delete/:id", ensureAuthenticated, (req, res) => {
  //delete items
  const itemId = req.params.id;
  const sql = "DELETE FROM item WHERE itemId = ? ";
  mysql.query(sql, [itemId], (err, result) => {
    if (err) {
      res.status(500).send("Error Querying Database while deleting");
    } else {
      res.redirect("/seller/items");
    }
  });
});

router.get("/profile", ensureAuthenticated, (req, res) => {
  //see profile
  res.render("seller/profile");
});

router.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
    }
    res.redirect("/seller/login"); // Redirect to the login page after signing out
  });
});

function ensureAuthenticated(req, res, next) {
  if (req.session.seller) {
    return next(); // User is authenticated, proceed to the route
  }
  res.redirect("/seller/login"); // Redirect to the login page if not authenticated
}

module.exports = router;
