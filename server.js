const express = require("express");
const app = express();
const expressLayouts = require("express-ejs-layouts");
const session = require("express-session");
const path = require("path");
const methodOverride = require("method-override");
const mysql = require("./db");
const crypto = require("crypto");
const MYSQLStore = require("express-mysql-session")(session);
const flash = require("express-flash");
const generateKey = (length) => {
  return crypto.randomBytes(length).toString("hex");
};
const secretKey = generateKey(32);
const sessionStore = new MYSQLStore(
  {
    expiration: 10800000, // Session expiration time in milliseconds (3 hours)
    createDatabaseTable: true, // Creates the sessions table if it doesn't exist
  },
  mysql
);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.set("layout", "layouts/layout");
app.use(expressLayouts);
app.use(express.static("public"));
app.use(methodOverride("_method"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(flash());
app.use(
  session({
    secret: secretKey, // Replaces with a secret key for session encryption
    resave: false,
    saveUninitialized: true,
    store: sessionStore,
  })
);

const indexRouter = require("./routes/index");
const userRouter = require("./routes/user");
const sellerRouter = require("./routes/seller");
const adminRouter = require("./routes/admin");
app.use("/", indexRouter);
app.use("/user", userRouter);
app.use("/seller", sellerRouter);
app.use("/admin", adminRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on PORT ${PORT}`);
});
