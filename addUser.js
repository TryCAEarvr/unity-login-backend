require("dotenv").config();
const fs = require("fs");
const csv = require("csv-parser");
const mongoose = require("mongoose");
const bcrypt = require('bcryptjs');
const path = require("path");
const User = require("./models/User");

const csvFiles = ["users.csv", "users1.csv"]; // Add more here

mongoose.connect(process.env.MONGODB_URI).then(() => {
  console.log("✅ Connected to MongoDB");
  processCSVFiles();
});

async function processCSVFiles() {
  for (let file of csvFiles) {
    console.log(`📄 Processing: ${file}`);
    await processCSV(file);
  }

  console.log("✅ All users added from all CSVs");
  mongoose.connection.close();
}

async function processCSV(file) {
  return new Promise((resolve) => {
    const users = [];

    fs.createReadStream(path.join(__dirname, file))
      .pipe(csv())
      .on("data", (row) => {
        if (row.email && row.password) {
          users.push(row);
        } else {
          console.warn("⚠️ Skipping row due to missing email/password:", row);
        }
      })
      .on("end", async () => {
        for (let user of users) {
          try {
            const hashedPassword = await bcrypt.hash(user.password, 10);
            await User.create({
              email: user.email,
              password: hashedPassword,
            });
            console.log(`✅ Added user: ${user.email}`);
          } catch (err) {
            console.error(`❌ Error adding ${user.email}: ${err.message}`);
          }
        }
        resolve();
      });
  });
}
