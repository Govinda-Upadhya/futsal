import { Admin } from "../../db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../../config.js";
export const adminSignUp = async (req, res) => {
  const { name, password, profile, email, contact } = req.body;

  try {
    const userExists = await Admin.find({
      email: email,
    });

    if (userExists.length != 0) {
      return res.send("user already exists");
    }
    const salt = await bcrypt.genSalt(5);
    const newPassword = await bcrypt.hash(password, salt);
    let createUser = await Admin.create({
      name: name,
      profile: profile | null,
      password: newPassword,
      email: email,
      contact: contact,
    });
    if (createUser) {
      return res.send("admin created successfully");
    }
    return res.send("Admin couldnt be created. Please try again");
  } catch (error) {
    console.log("error", error);
  }
};

export const adminSignIn = async (req, res) => {
  const { email, password } = req.body;

  try {
    const userExists = await Admin.find({
      email: email,
    });

    if (!userExists) {
      return res.send("user doesn't exists. Please signup.");
    }

    const passwordVerified = await bcrypt.compare(
      password,
      userExists[0].password
    );
    if (!passwordVerified) {
      return res.send("Password is incorrect");
    }
    const token = jwt.sign({ email: email }, JWT_SECRET, {
      expiresIn: "7d",
    });
    return res
      .cookie("token", token, {
        httpOnly: true,
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .json({ message: "Login successful" });
  } catch (error) {
    console.log("error", error);
  }
};
