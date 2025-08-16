import { Admin } from "../../db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {
  AWS_ACCESS_KEY,
  AWS_BUCKET_NAME,
  AWS_REGION,
  AWS_SECRET_KEY,
  JWT_SECRET,
} from "../../config.js";

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY,
    secretAccessKey: AWS_SECRET_KEY,
  },
});

export const adminSignUp = async (req, res) => {
  const { name, password, profile, email, contact } = req.body;
  console.log(password);
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
      profile: profile,
      password: newPassword,
      email: email,
      contact: contact,
    });
    if (createUser) {
      return res.status(200).send("admin created successfully");
    }
    return res.status(400).send("Admin couldnt be created. Please try again");
  } catch (error) {
    console.log("error", error);
  }
};
export const adminProfile = async (req, res) => {
  const { fileName, fileType } = req.body;
  const key = `profiles/${Date.now()}-${fileName}`;
  const imageUrl = `https://${AWS_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${key}`;

  const command = new PutObjectCommand({
    Bucket: AWS_BUCKET_NAME,
    Key: key,
    ContentType: fileType,
  });

  try {
    const url = await getSignedUrl(s3, command, { expiresIn: 60 });
    return res.json({ url, imageUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not generate presigned URL" });
  }
};
export const adminSignIn = async (req, res) => {
  const { email, password } = req.body;

  try {
    const userExists = await Admin.find({
      email: email,
    });

    if (userExists.length == 0) {
      return res.status(400).send("user doesn't exists. Please signup.");
    }

    const passwordVerified = await bcrypt.compare(
      password,
      userExists[0].password
    );
    if (!passwordVerified) {
      return res.status(400).send("Password is incorrect");
    }
    const token = jwt.sign({ email: email }, JWT_SECRET, {
      expiresIn: "7d",
    });

    return res
      .cookie("token", token, {
        sameSite: "lax", // or 'none' if using https + cross-origin
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .json({ message: "Login successful" });
  } catch (error) {
    console.log("error", error);
  }
};

export const isLoggedIn = async (req, res) => {
  const admin = req.admin;
  return res.status(200).send("user logged in");
};
