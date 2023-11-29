const bcrypt = require("bcrypt");
const express = require("express");
const router = express.Router();
const mysql = require("../db");
const Organization = require("../models/organization");
const Events = require("../models/Event");
const { isEmail, isLength } = require("validator");

router.get("/", (req, res) => {
  res.render("organization/main");
});

router.get("/signup", (req, res) => {
  res.render("organization/signup");
});

router.post("/signup", (req, res) => {
  try {
    const name = req.body.name;
    const userName = req.body.username;
    const email = req.body.email;
    const password = req.body.password;

    // Validate inputs
    if (
      !name ||
      !userName ||
      !isEmail(email) ||
      !isLength(password, { min: 8 })
    ) {
      req.flash("error", "Invalid input data.");
      res.status(400).send("Invalid input data.");
      return;
    }

    const newOrg = new Organization(name, userName, email, password);
    const sql =
      "INSERT INTO organization(name,email,username,password) VALUES (?,?,?,?)";
    const hashedPassword = bcrypt.hashSync(password, 10);

    mysql.query(
      sql,
      [newOrg.name, newOrg.email, newOrg.username, hashedPassword],
      (err, results) => {
        if (err) {
          console.error(err);
          if (err.code === "ER_DUP_ENTRY") {
            req.flash(
              "error",
              "Username already exists. Please choose a different one."
            );
            res
              .status(409)
              .send("Username already exists. Please choose a different one.");
          } else {
            req.flash(
              "error",
              "Error creating organization. Check username uniqueness."
            );
            res
              .status(500)
              .send("Error creating organization. Check username uniqueness.");
          }
        } else {
          // Seller registration successful
          req.flash("success", "organization registration successful.");
          console.log("organization registration successful.");
          res.redirect("/org/login");
        }
      }
    );
  } catch (error) {
    console.error(error);
    req.flash("error", "Internal Server Error");
    res.status(500).send("Internal Server Error");
  }
});

router.get("/login", (req, res) => {
  res.render("organization/login");
});
router.post("/login", (req, res) => {
  const userName = req.body.username;
  const password = req.body.password;
  const sql = "SELECT * FROM organization WHERE username = ?";

  mysql.query(sql, [userName], (err, result) => {
    if (err) {
      console.error(err);
      req.flash(
        "error",
        "Error authenticating organization. Please try again."
      );
      res.redirect("/org/login"); // Redirect on error
    } else if (result.length > 0) {
      const organization = result[0];
      if (bcrypt.compareSync(password, organization.password)) {
        req.session.organization = organization;
        req.flash("success", "Login successful. Welcome to your dashboard!");
        res.redirect("/org/dashboard");
      } else {
        req.flash("error", "Password does not match. Please try again.");
        res.redirect("/org/login"); // Redirect on incorrect password
      }
    } else {
      req.flash("error", "User not found. Please sign up.");
      res.redirect("/org/signup"); // Redirect if user not found
    }
  });
});

router.get("/dashboard", ensureAuthenticated, (req, res) => {
  res.render("organization/dashboard");
});

router.get("/events", ensureAuthenticated, (req, res) => {
  const orgID = req.session.organization.orgID;
  const sql = "SELECT * FROM event WHERE orgId = ?";
  mysql.query(sql, [orgID], (err, result) => {
    if (err) {
      console.log(err);
      res.status(500).send("Error Connecting Database");
    } else if (result.length > 0) {
      res.render("organization/event/view", { events: result });
    } else {
      res.status(400).send("No Event Exists");
    }
  });
});

router.get("/events/add", ensureAuthenticated, (req, res) => {
  const sql = "SELECT categoryID, name, description FROM category";
  mysql.query(sql, (err, results) => {
    if (err) {
      console.error(err);
      req.flash("error", "Server Error");
      res.redirect("/org/events");
    } else if (results.length > 0) {
      const citySql = "SELECT cityId, cityName FROM city";
      mysql.query(citySql, (cityErr, cityResults) => {
        if (cityErr) {
          console.error(cityErr);
          req.flash("error", "Error fetching cities");
          res.redirect("/org/events");
        } else {
          res.render("organization/event/addEvent", {
            categories: results,
            cities: cityResults,
            session: req.session,
          });
        }
      });
    } else {
      req.flash("error", "Can't fetch Categories");
      res.redirect("/org/events");
    }
  });
});

router.post("/events/add", (req, res) => {
  // Add event
  const eventName = req.body.eventName;
  const price = req.body.price;
  const orgId = req.body.orgId;
  const TotalTickets = req.body.TotalTickets;
  const RemainingTickets = req.body.RemainingTickets;
  const eventDate = req.body.eventDate;
  const endDate = req.body.endDate;
  const eventTime = req.body.eventTime;
  const Description = req.body.Description;
  const categoryId = req.body.category;
  const cityCode = req.body.cityId;
  const status = req.body.status;

  if (
    RemainingTickets > TotalTickets ||
    TotalTickets < 0 ||
    RemainingTickets < 0
  ) {
    req.flash(
      "error",
      "Remaining Tickets Should always be less than or equal to Total Tickets"
    );
    res.redirect("/org/events/add");
  }

  if (endDate < eventDate) {
    req.flash("error", "Event ending date cant be less than actual date");
    res.redirect("/org/events/add");
  }

  // Check if the organization with the specified orgId exists
  const orgSql = "SELECT * FROM organization WHERE orgID = ?";
  mysql.query(orgSql, [orgId], (err, orgResult) => {
    if (err) {
      console.error(err);
      req.flash("error", "Error querying database");
      res.status(500).send("Error querying database");
    } else if (orgResult.length > 0) {
      // Organization exists, proceed to add the event
      const newEvent = new Events(
        eventName,
        price,
        orgId,
        TotalTickets,
        RemainingTickets,
        eventDate,
        endDate,
        eventTime,
        Description,
        categoryId,
        cityCode,
        status
      );

      const eventSql =
        "INSERT INTO event(eventName, price, orgId,TotalTickets,RemainingTickets,eventDate,endDate,eventTime,Description,categoryId,cityCode,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)";

      // Insert the event into the database
      mysql.query(
        eventSql,
        [
          newEvent.eventName,
          newEvent.price,
          newEvent.orgId,
          newEvent.TotalTickets,
          newEvent.RemainingTickets,
          newEvent.eventDate,
          newEvent.endDate,
          newEvent.eventTime,
          newEvent.Description,
          newEvent.categoryId,
          newEvent.cityCode,
          newEvent.status,
        ],
        (err, eventResult) => {
          if (err) {
            console.error(err);
            req.flash("error", "Error querying database");
            res.status(500).send("Error querying database");
          } else {
            req.flash("success", "Event added successfully!");
            res.redirect("/org/events");
          }
        }
      );
    } else {
      req.flash(
        "error",
        `Organization with ID ${orgId} doesn't exist. Please check again.`
      );
      res
        .status(401)
        .send(
          `Organization with ID ${orgId} doesn't exist. Please check again.`
        );
    }
  });
});

router.get("/events/update/:id", ensureAuthenticated, (req, res) => {
  const eventId = req.params.id;
  const sql = "SELECT * FROM event WHERE eventId = ?";
  mysql.query(sql, [eventId], (err, result) => {
    if (err) {
      req.flash("error", "Error querying the database for updating event");
      res.status(500).redirect("/org/events");
    } else if (result.length > 0) {
      const categorysql = "SELECT categoryID, name, description FROM category";
      mysql.query(categorysql, (categoryerr, categoryresult) => {
        if (categoryerr) {
          req.flash("error", "Error querying the database for updating event");
          res.status(500).redirect("/org/events");
        } else if (categoryresult.length > 0) {
          const citysql = "SELECT cityId, cityName FROM city";
          mysql.query(citysql, (cityerr, cityresult) => {
            if (cityerr) {
              req.flash(
                "error",
                "Error querying the database for updating event"
              );
              res.status(500).redirect("/org/events");
            } else if (cityresult.length > 0) {
              const event = result[0];
              const cities = cityresult;
              const categories = categoryresult;
              res.render("organization/event/updateEvent", {
                event: event,
                session: req.session,
                cities: cities,
                categories: categories,
              });
            } else {
              req.flash("error", "City doesn't exist. Check again.");
              res.status(401).redirect("/org/events");
            }
          });
        } else {
          req.flash("error", "Category doesn't exist. Check again.");
          res.status(401).redirect("/org/events");
        }
      });
    } else {
      req.flash(
        "error",
        `Event with ID ${eventId} doesn't exist. Check again.`
      );
      res.status(401).redirect("/org/events");
    }
  });
});

router.put("/events/update/:id", (req, res) => {
  const eventId = req.params.id;
  const eventName = req.body.eventName;
  const price = req.body.price;
  const orgId = req.body.orgId;
  const TotalTickets = req.body.TotalTickets;
  const RemainingTickets = req.body.RemainingTickets;
  const eventDate = req.body.eventDate;
  const endDate = req.body.endDate;
  const eventTime = req.body.eventTime;
  const Description = req.body.Description;
  const categoryId = req.body.category;
  const cityCode = req.body.cityId;

  if (
    RemainingTickets > TotalTickets ||
    isNaN(TotalTickets) ||
    isNaN(RemainingTickets) ||
    TotalTickets < 0 ||
    RemainingTickets < 0
  ) {
    req.flash(
      "error",
      "Remaining tickets should always be less or equal to Total Tickets"
    );
    res.redirect("/org/events/update/:id");
  }

  if (endDate < eventDate) {
    req.flash("error", "Event ending date cant be less than actual date");
    res.redirect("/org/events/add");
  }
  const newEvent = new Events(
    eventName,
    price,
    orgId,
    TotalTickets,
    RemainingTickets,
    eventDate,
    endDate,
    eventTime,
    Description,
    categoryId,
    cityCode
  );

  const updateSql =
    "UPDATE event SET eventName = ?, price = ?, orgId = ?, TotalTickets=?, RemainingTickets=?, eventDate=?,endDate=?, eventTime=?, Description=?, categoryId=?, cityCode=? WHERE eventId = ?";

  mysql.query(
    updateSql,
    [
      newEvent.eventName,
      newEvent.price,
      newEvent.orgId,
      newEvent.TotalTickets,
      newEvent.RemainingTickets,
      newEvent.eventDate,
      newEvent.endDate,
      newEvent.eventTime,
      newEvent.Description,
      newEvent.categoryId,
      newEvent.cityCode,
      eventId,
    ],
    (err, result) => {
      if (err) {
        console.error(err);
        req.flash("error", "Error updating event. Please try again.");
        res.redirect("/org/events");
      } else {
        req.flash("success", "Event updated successfully!");
        res.redirect("/org/events");
      }
    }
  );
});

router.delete("/events/cancel/:id", ensureAuthenticated, (req, res) => {
  // delete events
  const eventId = req.params.id;

  const cancelEventSql = "CALL cancelEvent(?)";

  mysql.query(cancelEventSql, [eventId], (err, result) => {
    if (err) {
      console.error(err);
      req.flash("error", "Error canceling event. Please try again.");
    } else {
      req.flash("success", "Event canceled successfully!");
    }
    res.redirect("/org/events");
  });
});

router.get("/myreservations", ensureAuthenticated, (req, res) => {
  const user = req.session.user;
  const id = user.id;
  const sql = `select r.eventId,count(*) as "count" from reservation r 
             inner join event e on r.eventId=e.eventId 
             where orgId=?
             group by r.eventId`;

  mysql.query(sql, [id], (err, results) => {
    const events = results;
    if (err) {
      console.error(err);
      res.status(500).send("Error Querying database");
    } else if (results.length > 0) {
      const sql1 = `SELECT e.eventName,u.username,c.name,ci.cityName,r.ticket_quantity,r.total_amount,r.reservationTime
               FROM reservation r inner join event e  on r.eventId=e.eventId
               inner join category c on e.categoryId=c.categoryID
               inner join city ci on e.cityCode=ci.cityId
               inner join user u o on u.id=r.userId
               WHERE e.orgId = ?
               order by r.reservationTime desc`;
      mysql.query(sql1, [id], (err, results1) => {
        const reserve = results1;
        if (err) {
          console.error(err);
          res.status(500).send("Error Querying database");
        } else if (results1.length > 0) {
          res.render("user/MyReservations", {
            reserve: reserve,
            events: events,
          });
        } else {
          res.render("user/MyReservations", { reserve: null, events: events });
        }
      });
    } else {
      res.render("user/MyReservations", { reserve: null, events: null });
    }
  });
});
router.get("/profile", ensureAuthenticated, (req, res) => {
  //see profile
  res.render("organization/profile");
});

router.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
    }
    res.redirect("/org/login"); // Redirect to the login page after signing out
  });
});

function ensureAuthenticated(req, res, next) {
  if (req.session.organization) {
    return next(); // User is authenticated, proceed to the route
  }
  res.redirect("/org/login"); // Redirect to the login page if not authenticated
}

module.exports = router;
