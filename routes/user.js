const bcrypt = require("bcrypt");
const express = require("express");
const router = express.Router();
const mysql = require("../db");

const User = require("../models/user");
const Cart = require("../models/cart");
const Order = require("../models/order");
const { isEmail, isLength } = require("validator");
const { closeDelimiter } = require("ejs");

router.get("/", ensureAuthenticated, (req, res) => {
  const sql =
    "SELECT categoryID,name,description FROM category order by categoryID asc";
  mysql.query(sql, (err, result) => {
    if (err) {
      console.error(err);
      req.flash("error", "server error");
      res.redirect("/user");
    } else if (result.length > 0) {
      const categories = result;
      res.render("user/main", { categories: categories });
    } else {
      res.render("user/main", { categories: null });
    }
  });
});
var userId = 0;
router.get("/signup", (req, res) => {
  const sql = "SELECT cityId,cityName FROM city";
  mysql.query(sql, (err, results) => {
    if (err) {
      console.error(err);
      req.flash("error", "Server Error");
      res.redirect("/user/signup");
    } else if (results.length > 0) {
      res.render("user/signup", { cities: results });
    } else {
      req.flash("error", "Cant fetch Cities");
      res.redirect("/user/signup");
    }
  });
});

// User registration (Signup)
router.post("/signup", (req, res) => {
  try {
    // Extract user input from the request
    const userName = req.body.username;
    const password = req.body.password;
    const email = req.body.email;
    const age = req.body.age;
    const cityId = req.body.city;

    // Validate inputs
    if (!userName || !email || !password || !age || !cityId) {
      res.status(400).send("All fields are required.");
      return;
    }

    if (!isEmail(email) || !isLength(password, { min: 8 })) {
      res.status(400).send("Invalid email or password.");
      return;
    }

    // Hash the password
    const hashedPassword = bcrypt.hashSync(password, 10);

    // Create a user object
    const newUser = {
      username: userName,
      email: email,
      password: hashedPassword,
      age: age,
      cityId: cityId,
    };

    // Define the SQL query
    const sql =
      "INSERT INTO users (username, email, password, age, cityId) VALUES (?, ?, ?, ?, ?)";

    // Execute the query
    mysql.query(
      sql,
      [
        newUser.username,
        newUser.email,
        newUser.password,
        newUser.age,
        newUser.cityId,
      ],
      (err, results) => {
        if (err) {
          console.error(err);

          // Check for duplicate username error
          if (err.code === "ER_DUP_ENTRY") {
            res
              .status(400)
              .send("Username already exists. Please choose a different one.");
          } else {
            res.status(500).send("Error creating user.");
          }
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

router.post("/login", (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  const sql = "SELECT * FROM users WHERE username = ?";
  mysql.query(sql, [username], (err, results) => {
    if (err) {
      console.error(err);
      req.flash("error", "Server Error. Please try again.");
      res.redirect("/user/login");
    } else if (results.length > 0) {
      const user = results[0];
      userId = user.userId;

      if (bcrypt.compareSync(password, user.password)) {
        req.session.user = user;
        res.redirect("/user");
      } else {
        req.flash("error", "Incorrect password. Please try again.");
        res.redirect("/user/login");
      }
    } else {
      req.flash("error", "User not found. Please sign up.");
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

router.get("/category/:id", (req, res) => {
  const sql =
    "SELECT eventId,eventName,price,orgId,TotalTickets,RemainingTickets,eventDate,eventTime,Description,categoryId,cityCode FROM event WHERE categoryId = ?";
  const id = req.params.id;
  mysql.query(sql, [id], (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).send("Error Querying database");
    } else if (results.length > 0) {
      const events = results;

      res.render("user/showevents", { events: events });
    } else {
      res.render("user/showevents", { events: null });
    }
  });
});

router.post("/shop/add_to_cart", ensureAuthenticated, (req, res) => {
  const itemId = req.body.itemId;
  const sellerId = req.body.sellerId;
  const quantity = 1;
  const user = req.session.user;
  const newCart = new Cart(itemId, user.userId, quantity);
  const sql1 = "select * from cart where itemId=? and userId=?";
  mysql.query(sql1, [newCart.itemId, newCart.uid], (err, results) => {
    if (err) {
      console.error(err);
      res
        .status(500)
        .send({ success: false, message: "Error adding item to cart" });
    } else if (results.length > 0) {
      const sq =
        "update cart set quantity=quantity+1 where itemId=? and userId=?";
      mysql.query(sq, [newCart.itemId, newCart.uid], (err, results) => {
        if (err) {
          console.error(err);
          res
            .status(500)
            .send({ success: false, message: "Error adding item to cart" });
        } else {
          res.redirect(`/user/shop/${sellerId}`);
        }
      });
    } else {
      const sq = "INSERT INTO cart (itemId, userId, quantity) VALUES (?, ?, ?)";

      mysql.query(
        sq,
        [newCart.itemId, newCart.uid, newCart.quantity],
        (err, results) => {
          if (err) {
            console.error(err);
            res
              .status(500)
              .send({ success: false, message: "Error adding item to cart" });
          } else {
            res.redirect(`/user/shop/${sellerId}`);
          }
        }
      );
    }
  });
});
router.get("/cart", ensureAuthenticated, (req, res) => {
  const user = req.session.user;
  const id = user.userId;
  const sql = `SELECT i.itemId,i.itemName,i.price,s.name,c.quantity 
                FROM item i inner join cart c on i.itemId=c.itemId
                inner join seller s on s.sellerId=i.sellerId
                WHERE c.userId = ?`;

  mysql.query(sql, [id], (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).send("Error Querying database");
    } else if (results.length > 0) {
      const cartItems = results;

      res.render("user/cart", { cartItems: cartItems });
    } else {
      res.render("user/cart", { cartItems: null });
    }
  });
});
router.delete("/cart/delete/:id", ensureAuthenticated, (req, res) => {
  const itemId = req.params.id;
  const user = req.session.user;
  const userId = user.userId;
  const sql = "DELETE FROM cart WHERE itemId = ? and userId=? ";
  mysql.query(sql, [itemId, userId], (err, result) => {
    if (err) {
      res.status(500).send("Error Querying Database while deleting");
    } else {
      res.redirect("/user/cart");
    }
  });
});

router.post("/order", ensureAuthenticated, (req, res) => {
  const itemId = 0;
  const quantity = 1;
  const user = req.session.user;
  const newCart = new Cart(itemId, user.userId, quantity);
  const sql1 = "select * from cart where  userId=?";
  mysql.query(sql1, [newCart.uid], (err, results) => {
    if (err) {
      console.error(err);
      res
        .status(500)
        .send({ success: false, message: "Error adding item to cart" });
    } else if (results.length > 0) {
      results.forEach((item) => {
        const neworder = new Order(
          item.itemId,
          item.quantity,
          item.userId,
          "processing"
        );
        const sql =
          "insert into orders (itemId,userId,order_status,quantity) values(?,?,?,?)";
        mysql.query(
          sql,
          [neworder.itemId, neworder.uid, neworder.status, neworder.quantity],
          (err, results) => {
            if (err) {
              console.error(err);
              res
                .status(500)
                .send({ success: false, message: "Error adding item to cart" });
            }
          }
        );
      });
      res.redirect("/user/cart");
    }
  });
});
router.get("/order_history", ensureAuthenticated, (req, res) => {
  const user = req.session.user;
  const id = user.userId;
  const sql = `SELECT i.itemName,i.price,s.name,o.quantity,o.order_status
               FROM item i inner join orders o on i.itemId=o.itemId
               inner join seller s on s.sellerId=i.sellerId
               WHERE o.userId = ?`;

  mysql.query(sql, [id], (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).send("Error Querying database");
    } else if (results.length > 0) {
      const orderItems = results;

      res.render("user/order-history", { orderItems: orderItems });
    } else {
      res.render("user/order-history", { orderItems: null });
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
