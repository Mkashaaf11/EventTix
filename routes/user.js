const bcrypt = require("bcrypt");
const express = require("express");
const router = express.Router();
const mysql = require("../db");

const User = require("../models/user");
const Reservation = require("../models/reservation");
const Order = require("../models/order");
const { isEmail, isLength } = require("validator");
const { closeDelimiter } = require("ejs");
router.get("/", ensureAuthenticated, (req, res) => {
  const getCategorySql =
    "SELECT categoryID, name, description FROM category ORDER BY categoryID ASC";

  mysql.query(getCategorySql, (categoryErr, categoriesResult) => {
    if (categoryErr) {
      console.error(categoryErr);
      req.flash("error", "Server error (Categories)");
      return res.redirect("/user");
    }

    const categories = categoriesResult;

    const updateStatusSql = "CALL UpdateEventStatusClosed()";

    mysql.query(updateStatusSql, (updateStatusErr) => {
      if (updateStatusErr) {
        console.error(updateStatusErr);
      } else {
        console.log("Status changed to closed for some events");
      }

      const getRecommendationsSql = `
      SELECT e.eventName, e.price, e.eventDate, e.eventTime,e.eventId, ct.cityName
      FROM event e
      INNER JOIN city ct ON e.cityCode = ct.cityId
      INNER JOIN (
          SELECT c.categoryID
          FROM category c
          INNER JOIN event ev ON c.categoryID = ev.categoryId
          INNER JOIN reservation r ON ev.eventId = r.eventId
          WHERE r.userId = ?
          GROUP BY c.categoryID
          ORDER BY COUNT(*) DESC
          LIMIT 5
      ) AS subquery ON e.categoryID = subquery.categoryID;
      
      `;

      mysql.query(
        getRecommendationsSql,
        [req.session.user.id],
        (recErr, recResult) => {
          if (recErr) {
            console.error(recErr);
            req.flash("error", "Server error (Recommendations)");
            return res.redirect("/user");
          }

          const getNewSql = `
          SELECT e.eventName, e.price, e.eventDate, e.eventTime,e.eventId, ct.cityName
          FROM event e
          INNER JOIN city ct ON e.cityCode = ct.cityId
          LEFT JOIN (
              SELECT c.categoryID
              FROM category c
              INNER JOIN event ev ON c.categoryID = ev.categoryId
              INNER JOIN reservation r ON ev.eventId = r.eventId
              WHERE r.userId = ?
              GROUP BY c.categoryID
              ORDER BY COUNT(*) DESC
              LIMIT 5
          ) AS subquery ON e.categoryID = subquery.categoryID
          WHERE subquery.categoryID IS NULL and e.status in ('active','soldout');
          
          `;

          mysql.query(getNewSql, [req.session.user.id], (NewErr, NewResult) => {
            if (NewErr) {
              console.error(NewErr);
              req.flash("error", "Server error (New Events)");
              return res.redirect("/user");
            }

            const recommendation = recResult.length > 0 ? recResult : null;
            const newToYou = NewResult.length > 0 ? NewResult : null;

            res.render("user/main", { categories, recommendation, newToYou });
          });
        }
      );
    });
  });
});

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

    const blockSql = `SELECT * FROM restrictor WHERE email= ? `;
    mysql.query(blockSql, [email], (err, blockresult) => {
      if (err) {
        console.error(err);
        req.flash("error", "Server Error. Please try again.");
        res.redirect("/user/signup");
      } else if (blockresult.length > 0) {
        req.flash(
          "error",
          "You are blocked due to violating our terms and conditions"
        );
        res.redirect("/");
      } else {
        // Hash the password
        const hashedPassword = bcrypt.hashSync(password, 10);

        // Create a user object
        const newUser = new User(userName, email, password, age, cityId);
        // Define the SQL query
        const sql =
          "INSERT INTO users (username, email, password, age, cityId) VALUES (?, ?, ?, ?, ?)";
        mysql.query(
          sql,
          [
            newUser.username,
            newUser.email,
            hashedPassword,
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
                  .send(
                    "Username already exists. Please choose a different one."
                  );
              } else {
                res.status(500).send("Error creating user.");
              }
            } else {
              // User registration successful
              res.redirect("/user/login");
            }
          }
        );
      }
    });

    // Execute the query
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

      const blockSql = `SELECT * FROM restrictor WHERE email= ? `;
      mysql.query(blockSql, [user.email], (err, blockresult) => {
        if (err) {
          console.error(err);
          req.flash("error", "Server Error. Please try again.");
          res.redirect("/user/login");
        } else if (blockresult.length > 0) {
          req.flash(
            "error",
            "You are blocked due to violating our terms and conditions"
          );
          res.redirect("/");
        } else {
          if (bcrypt.compareSync(password, user.password)) {
            req.session.user = user;
            res.redirect("/user");
          } else {
            req.flash("error", "Incorrect password. Please try again.");
            res.redirect("/user/login");
          }
        }
      });
    } else {
      console.log("User not found");
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
  const sql = `SELECT eventId,eventName,price,orgId,TotalTickets,RemainingTickets,eventDate,
    eventTime,Description,categoryId,cityCode FROM event WHERE categoryId = ?`;

  const id = req.params.id;
  mysql.query(sql, [id], (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).send("Error Querying database");
    } else if (results.length > 0) {
      const timeIntervalCheck = "call  UpdateEventStatusClosed()";
      mysql.query(timeIntervalCheck, (err, result) => {
        if (err) {
          console.error(err);
          req.flash("error", "error changing status to closed");
        } else {
          console.log("Status changed to closed of some events");
        }
      });
      const events = results;

      res.render("user/showevents", { events: events });
    } else {
      res.render("user/showevents", { events: null });
    }
  });
});

router.get("/reserve/:id", ensureAuthenticated, (req, res) => {
  const id = req.params.id;
  const sql = `select eventId,eventName,price,eventDate,eventTime,description,cityName,name from   event e inner join city c
              on c.cityId=e.cityCode inner join organization o on e.orgID=o.orgId
              where eventId=?`;

  mysql.query(sql, [id], (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).send("Error Querying database");
    } else if (results.length > 0) {
      const info = results[0];
      res.render("user/confirmBooking", { info: info });
    } else {
      res.render("user/confirmBooking", { info: null });
    }
  });
});
router.post("/reserve", ensureAuthenticated, (req, res) => {
  const eventId = req.body.eventId;
  const quantity = req.body.quantity;
  const user = req.session.user;
  const price = req.body.price;
  const newReservation = new Reservation(eventId, user.id, quantity, price);

  // Start a transaction
  mysql.query("START TRANSACTION", (startErr) => {
    if (startErr) {
      console.error(startErr);
      return res
        .status(500)
        .send({ success: false, message: "Error starting transaction" });
    }

    const sql =
      "INSERT INTO reservation(userId, eventId, ticket_quantity, total_amount) VALUES (?, ?, ?, ?)";
    mysql.query(
      sql,
      [
        newReservation.uid,
        newReservation.eventId,
        newReservation.quantity,
        newReservation.amount,
      ],
      (err, results) => {
        if (err) {
          // Roll back the transaction on error
          mysql.query("ROLLBACK", () => {
            if (err.sqlState === "45000") {
              req.flash("error", "Not enough tickets are available");
              res.status(500).redirect(`/user/reserve/${eventId}`);
            } else {
              console.error(err);
              res
                .status(500)
                .send({ success: false, message: "Error booking event" });
            }
          });
        } else {
          const sql1 = "SELECT categoryId FROM event WHERE eventId=?";
          mysql.query(sql1, [newReservation.eventId], (err1, results1) => {
            if (err1) {
              console.error(err1);
              // Roll back the transaction on error
              mysql.query("ROLLBACK", () => {
                res
                  .status(500)
                  .send({ success: false, message: "Error refreshing" });
              });
            } else if (results1.length > 0) {
              const cat = results1[0].categoryId;

              // Commit the transaction if everything is successful
              mysql.query("COMMIT", (commitErr) => {
                if (commitErr) {
                  console.error(commitErr);
                  return res.status(500).send({
                    success: false,
                    message: "Error committing transaction",
                  });
                }

                req.flash("success", "Your reservation is successful");
                res.redirect(`/user/category/${cat}`);
              });
            }
          });
        }
      }
    );
  });
});

// router.post("/reserve", ensureAuthenticated, (req, res) => {
//   const eventId = req.body.eventId;
//   const quantity = req.body.quantity;
//   const user = req.session.user;
//   const price = req.body.price;
//   const newReservation = new Reservation(eventId, user.id, quantity, price);

//   // Start a transaction
//   mysql.beginTransaction((err) => {
//     if (err) {
//       console.error(err);
//       return res
//         .status(500)
//         .send({ success: false, message: "Error starting transaction" });
//     }

//     const sql =
//       "INSERT INTO reservation(userId, eventId, ticket_quantity, total_amount) VALUES (?, ?, ?, ?)";
//     mysql.query(
//       sql,
//       [
//         newReservation.uid,
//         newReservation.eventId,
//         newReservation.quantity,
//         newReservation.amount,
//       ],
//       (err, results) => {
//         if (err) {
//           // Roll back the transaction on error
//           mysql.rollback(() => {
//             if (err.sqlState === "45000") {
//               req.flash("error", "Not enough tickets are available");
//               res.status(500).redirect(`/user/reserve/${eventId}`);
//             } else {
//               console.error(err);
//               res
//                 .status(500)
//                 .send({ success: false, message: "Error booking event" });
//             }
//           });
//         } else {
//           const sql1 = "SELECT categoryId FROM event WHERE eventId=?";
//           mysql.query(sql1, [newReservation.eventId], (err1, results1) => {
//             if (err1) {
//               console.error(err1);
//               res
//                 .status(500)
//                 .send({ success: false, message: "Error refreshing" });
//             } else if (results1.length > 0) {
//               const cat = results1[0].categoryId;

//               // Commit the transaction if everything is successful
//               mysql.commit((commitErr) => {
//                 if (commitErr) {
//                   // Roll back the transaction on commit error
//                   console.error(commitErr);
//                   return res.status(500).send({
//                     success: false,
//                     message: "Error committing transaction",
//                   });
//                 }

//                 req.flash("success", "Your reservation is successful");
//                 res.redirect(`/user/category/${cat}`);
//               });
//             }
//           });
//         }
//       }
//     );
//   });
// });

router.get("/myreservations", ensureAuthenticated, (req, res) => {
  const user = req.session.user;
  const id = user.id;
  const sql = `SELECT e.eventName,o.name as "org",c.name,ci.cityName,r.ticket_quantity,r.total_amount,r.reservationTime
               FROM reservation r inner join event e  on r.eventId=e.eventId
               inner join category c on e.categoryId=c.categoryID
               inner join city ci on e.cityCode=ci.cityId
               inner join organization o on o.orgID=e.orgId
               WHERE r.userId = ?
               order by r.reservationTime desc`;

  mysql.query(sql, [id], (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).send("Error Querying database");
    } else if (results.length > 0) {
      const timeIntervalCheck = "call  UpdateEventStatusClosed()";
      mysql.query(timeIntervalCheck, (err, result) => {
        if (err) {
          console.error(err);
          req.flash("error", "error changing status to closed");
        } else {
          console.log("Status changed to closed of some events");
        }
      });
      const reserve = results;

      res.render("user/MyReservations", { reserve: reserve });
    } else {
      res.render("user/MyReservations", { reserve: null });
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
