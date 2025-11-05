require("dotenv").config();
const fs = require("fs");
const csv = require("csv-parser");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const path = require("path");
const User = require("./models/User");

// List all CSV files you want to process
const csvFiles = ["users.csv", "users1.csv"]; // Add more if needed

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("✅ Connected to MongoDB");
    processCSVFiles();
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
  });

// Loop through all CSV files
async function processCSVFiles() {
  for (let file of csvFiles) {
    console.log(`📄 Processing file: ${file}`);
    await processCSV(file);
  }

  console.log("✅ All users processed successfully");
  mongoose.connection.close();
}

// Read and insert users from CSV
async function processCSV(file) {
  return new Promise((resolve) => {
    const users = [];

    fs.createReadStream(path.join(__dirname, file))
      .pipe(csv())
      .on("data", (row) => {
        if (row.email && row.password) {
          users.push(row);
        } else {
          console.warn("⚠️ Skipping row with missing email/password:", row);
        }
      })
      .on("end", async () => {
        for (let user of users) {
          try {
            // hash the password
            const hashedPassword = await bcrypt.hash(user.password, 10);

            // build subscription info
            const subscriptionData = {
              active: (user.subscribed?.toString().toLowerCase() === "true") || false,
              expiry: user.expiry ? new Date(user.expiry) : null,
              productId: user.productId || null,
            };

            // insert into MongoDB
            await User.create({
              email: user.email.trim(),
              password: hashedPassword,
              subscription: subscriptionData,
            });

            console.log(`✅ Added user: ${user.email}`);
          } catch (err) {
            if (err.code === 11000) {
              console.warn(`⚠️ Skipping duplicate user: ${user.email}`);
            } else {
              console.error(`❌ Error adding ${user.email}: ${err.message}`);
            }
          }
        }
        resolve();
      });
  });
}
