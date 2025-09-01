import { Admin, Booking, Ground } from "../../db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import {
  APP_EMAIL,
  APP_PASS,
  AWS_ACCESS_KEY,
  AWS_BUCKET_NAME,
  AWS_REGION,
  AWS_SECRET_KEY,
  JWT_SECRET,
} from "../../config.js";

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { allowedOrigin } from "../../index.js";
import { transporterMain } from "../../lib.js";

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
export const getAdmin = async (req, res) => {
  const admin = req.admin;
  const info = await Admin.findOne({ email: admin.email });

  return res.json({ admin: { name: info.name, image: info.profile } });
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
        sameSite: "lax",
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .json({ message: "Login successful", token: token });
  } catch (error) {
    console.log("error", error);
  }
};

export const isLoggedIn = async (req, res) => {
  const admin = req.admin;
  return res.status(200).send("user logged in");
};

export const getBooking = async (req, res) => {
  const adminId = req.admin;
  const admin_id = await Admin.findOne({ email: adminId.email });

  const grounds = await Ground.find({ admin: admin_id });

  const bookings = await Booking.find().populate("ground", "name");

  let mainBooking = [];
  for (const ground of grounds) {
    for (const booking of bookings) {
      if (String(booking.ground._id) == String(ground._id)) {
        mainBooking.push(booking);
      }
    }
  }

  return res.json({ bookings: mainBooking });
};

export const acceptBooking = async (req, res) => {
  try {
    const { bookingId } = req.body;
    const booking = await Booking.findByIdAndUpdate(bookingId, {
      status: "CONFIRMED",
    }).populate("ground", "name");
    if (!booking) {
      return res.status(404).json({ msg: "cannot find the booking" });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: APP_EMAIL,
        pass: APP_PASS,
      },
    });
    const formattedDate = new Date(booking.date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    await transporter.sendMail({
      from: APP_EMAIL,
      to: booking.email,
      subject: "Booking confirmed",
      text: `dear ${booking.name} your booking for ground ${booking.ground.name} on ${formattedDate} has been confirmed. please be on time and have fun`,
    });

    res.json({ message: "confirmation send to client" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send screenshot" });
  }
};

export const rejectBooking = async (req, res) => {
  const info = req.body;
  const booking = await Booking.findById(info.bookingId).populate(
    "ground",
    "name"
  );
  const admin = await Admin.findOne({ email: req.admin.email });
  if (!booking) {
    return res.status(404).json({ msg: "booking info invalid" });
  }
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: APP_EMAIL,
      pass: APP_PASS,
    },
  });
  const formattedDate = new Date(booking.date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  await transporter.sendMail({
    from: APP_EMAIL,
    to: booking.email,
    subject: "Booking rejected",
    text: `dear ${booking.name} your booking for ground ${booking.ground.name} on ${formattedDate} has been rejected because of "${info.reason}" as stated by the owner of the ground, for further query please contact the owner at number ${admin.contact}`,
  });
  await transporter.sendMail({
    from: APP_EMAIL,
    to: admin.email,
    subject: `booking with id ${booking._id} done by ${booking.name} with contact info ${booking.contact} becuase of reason "${info.reason}"`,
    text: `dear ${booking.name} your booking for ground ${booking.ground.name} on ${booking.date} has been rejected because of "${info.reason}" as stated by the owner of the ground, for further query please contact the owner`,
  });
  await Booking.deleteOne({ _id: booking._id });
  return res.json({ msg: "booking rejected and removed successfully " });
};

export const deleteBooking = async (req, res) => {
  const id = req.params.id;
  const deleting = await Booking.deleteOne({ _id: id });
  if (!deleting) {
    return res.status(400).json({ msg: "couldnt be deleted" });
  }
  return res.json({ msg: "deleted successfully" });
};

export const changePassword = async (req, res) => {
  const id = req.params.id;
  console.log(id);
  const info = req.body;
  console.log(info);
  const user = await Admin.findById(id);
  if (!user) {
    return res.status(404).json({ msg: "user doesnt exist" });
  }
  const newPassword = await bcrypt.hash(info.password, 5);
  await Admin.updateOne({ _id: user._id }, { $set: { password: newPassword } });
  return res.status(200).json({ msg: "done" });
};
export const changePasswordLink = async (req, res) => {
  const info = req.body;
  try {
    const admin = await Admin.findOne({ email: info.email });
    if (!admin) {
      return res.status(404).json({ msg: "no such emails registered" });
    }
    const link = `${allowedOrigin}/admin/changePassword/${admin._id}`;
    await transporterMain.sendMail({
      from: APP_EMAIL,
      to: admin.email,
      subject: `change password`,
      text: `dear user please click on this link to change the password. ${link}`,
    });
    return res.status(200).json({ msg: "Link send to your email" });
  } catch (error) {
    return res.status(500).json({ msg: "Internal server" });
  }
};
