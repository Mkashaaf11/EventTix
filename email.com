const nodemailer = require('nodemailer');

// Create a Nodemailer transporter using your email service's SMTP settings
const transporter = nodemailer.createTransport({
  host: 'your-smtp-host',
  port: 587, // Port number for your email service
  secure: false, // Set to true if your service uses secure (TLS/SSL) connections
  auth: {
    user: 'your-email@example.com', // Your email address
    pass: 'your-email-password', // Your email password or API key
  },
});

// Create an email data object
const mailOptions = {
  from: 'your-email@example.com',
  to: 'user-email@example.com', // Replace with the user's email address
  subject: 'Order Confirmation',
  text: 'Your order has been confirmed. Thank you for shopping with us!',
  // You can also use HTML to create a more visually appealing email.
};

// Send the email
transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    console.error('Error sending email:', error);
  } else {
    console.log('Email sent:', info.response);
  }
});
