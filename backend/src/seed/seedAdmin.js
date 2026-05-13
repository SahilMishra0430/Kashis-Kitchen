require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const Admin = require("../models/Admin");

mongoose.connect(process.env.MONGODB_URI);

async function createAdmin() {
    try {
        const existing = await Admin.findOne({
            email: "admin@kashis.com",
        });

        if (existing) {
            console.log("Admin already exists");
            process.exit();
        }

        const hashedPassword = await bcrypt.hash("admin123", 10);

        await Admin.create({
            name: "Kashis Admin",
            email: "admin@kashis.com",
            password: hashedPassword,
        });

        console.log("Admin created successfully");
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

createAdmin();