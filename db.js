if (process.env.NODE_ENV != "production") {
  require("dotenv").config();
}
const mysql = require("mysql2");

// Create a connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

pool.getConnection((err, connection) => {
  if (err) {
    console.error("Error connecting to the database:", err);
  } else {
    console.log("Connected to the database");
  }

  // Release the connection
  connection.release();
});

module.exports = pool;
