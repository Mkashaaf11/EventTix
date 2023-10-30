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
  const sql = "SELECT sellerId,name FROM seller order by sellerId asc";
  mysql.query(sql, (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send("Error getting sellers");
    } else if (result.length > 0) {
      const shops = result;
      res.render("user/main",{ shops: shops });
    }
    else{
      res.render("user/main",{ shops: null });
    }
  });
});
var userId=0;
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
      userId=user.userId;
      if (bcrypt.compareSync(password, user.password)) {
        // Passwords match, login successful
      // Redirect to the user's dashboard

        req.session.user = user; // using Express sessions
        res.redirect("/user"); // Redirect to the user's dashboard

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

router.get("/shop/:id",(req,res)=>{
  const sql = "SELECT itemId,itemName,price,sellerId FROM item WHERE sellerId = ?";
  const id=req.params.id;
  mysql.query(sql, [id], (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).send("Error Querying database");
    } else if (results.length > 0) {
      const items = results;

      res.render("user/showitems", { items: items });
    } else {
      res.render("user/showitems",{items:null});
    }
  });
});


router.post("/shop/add_to_cart", ensureAuthenticated, (req, res) => {
  const itemId = req.body.itemId;
  const sellerId=req.body.sellerId;
  const quantity = 1;
  const user=req.session.user;
  const newCart = new Cart(itemId, user.userId, quantity);
  const sql1="select * from cart where itemId=? and userId=?";
  mysql.query(sql1, [newCart.itemId, newCart.uid], (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).send({ success: false, message: "Error adding item to cart" });
    } else if (results.length>0){
      const sq="update cart set quantity=quantity+1 where itemId=? and userId=?"
      mysql.query(sq, [newCart.itemId, newCart.uid], (err, results) => {
        if (err) {
          console.error(err);
          res.status(500).send({ success: false, message: "Error adding item to cart" });
        } else {
          res.redirect(`/user/shop/${sellerId}`);
        }
      });
    }
    else{
    const sq = "INSERT INTO cart (itemId, userId, quantity) VALUES (?, ?, ?)";
 
   mysql.query(sq, [newCart.itemId, newCart.uid, newCart.quantity], (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).send({ success: false, message: "Error adding item to cart" });
    } else {
      res.redirect(`/user/shop/${sellerId}`);
    }
  });
    }
  });


  
});
router.get("/cart", ensureAuthenticated,(req,res)=>{
  const user=req.session.user;
  const id=user.userId;
  const sql = `SELECT i.itemId,i.itemName,i.price,s.name,c.quantity 
                FROM item i natural join cart c
                natural join seller s
                WHERE c.userId = ?`;
 
  mysql.query(sql, [id], (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).send("Error Querying database");
    } else if (results.length > 0) {
    
      const cartItems = results;

        res.render("user/cart",{cartItems:cartItems});
      
    } 
    else{
      res.render("user/cart",{cartItems:null});
    }
  });


});
router.delete("/cart/delete/:id", ensureAuthenticated, (req, res) => {
  const itemId = req.params.id;
  const user=req.session.user;
  const userId=user.userId;
  const sql = "DELETE FROM cart WHERE itemId = ? and userId=? ";
  mysql.query(sql, [itemId,userId], (err, result) => {
    if (err) {
      res.status(500).send("Error Querying Database while deleting");
    } else {
      res.redirect("/user/cart");
    }
  });
});

router.post("/order", ensureAuthenticated, (req, res) => {
  
  const quantity = 1;
  const user=req.session.user;
  const newCart = new Cart(itemId, user.userId, quantity);
  const sql1="select * from cart where  userId=?";
  mysql.query(sql1, [newCart.uid], (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).send({ success: false, message: "Error adding item to cart" });
    } else if (results.length>0){
      results.forEach(item=>{
         const neworder=new Order(item.itemId,item.quantity,item.userId,'processing');
         const sql="insert into orders (itemId,userId,status,quantity) values(?,?,?,?)"
         mysql.query(sql, [neworder.itemId,neworder.uid,neworder.status,neworder.quantity], (err, results) => {
          if (err) {
            console.error(err);
            res.status(500).send({ success: false, message: "Error adding item to cart" });
          } 
        });
      });
      res.redirect("/user/cart");
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
