require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs'); // keep using bcryptjs since it's already in your project
const jwt = require('jsonwebtoken');
const User = require('./models/User');

const app = express();
app.use(cors());
app.use(bodyParser.json());

mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch((err) => console.error("❌ MongoDB Error", err));

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key_here';

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.json({ success: false, message: "Invalid email" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.json({ success: false, message: "Wrong password" });

    const token = jwt.sign(
        { email: user.email, userId: user._id },
        JWT_SECRET,
        { expiresIn: '1h' }
    );

    res.json({ success: true, token });
});

const port = process.env.PORT || 10000;
app.listen(port, () => {
    console.log(`✅ Server running on port ${port}`);
});
