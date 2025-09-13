import { Admin, Booking, Ground } from "../../db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { APP_EMAIL, APP_PASS, JWT_SECRET } from "../../config.js";

import { allowedOrigin } from "../../index.js";

// Corrected nodemailer transporter configuration
export const transporterMain = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: APP_EMAIL,
    pass: APP_PASS,
  },
  tls: {
    // This option can be used in development to bypass certificate errors
    rejectUnauthorized: false,
  },
});

export const adminSignUp = async (req, res) => {
  const { name, password, profile, email, contact, scanner } = req.body;
  console.log(password);
  try {
    const userExists = await Admin.find({
      email: email,
    });
    const contactExists = await Admin.find({ contact: contact });

    if (userExists.length != 0) {
      return res
        .status(404)
        .send({ msg: "user already exists,please use a different email." });
    }
    if (contactExists.length != 0) {
      return res
        .status(404)
        .send({ msg: "contact already exists,please use a different one." });
    }

    const salt = await bcrypt.genSalt(5);
    const newPassword = await bcrypt.hash(password, salt);
    let createUser = await Admin.create({
      name: name,
      profile: profile,
      password: newPassword,
      email: email,
      contact: contact,
      scanner: scanner,
    });
    if (createUser) {
      return res.status(200).send("admin created successfully");
    }
    return res.status(400).send("Admin couldnt be created. Please try again");
  } catch (error) {
    console.log("error", error);
  }
};
export const updateAdmin = async (req, res) => {
  const userInfo = req.admin;
  const user = await Admin.findOne({ email: userInfo.email });
  const { newInfo } = req.body;
  await Admin.updateOne(
    { email: user.email },
    {
      contact: newInfo.contact,
      profile: newInfo.profile,
      name: newInfo.name,
      scanner: newInfo.scanner,
    },
    { new: true, runValidators: true }
  );
  return res.status(200).json({ msg: "user Updated" });
};
export const getAdmin = async (req, res) => {
  const admin = req.admin;
  const info = await Admin.findOne({ email: admin.email });

  return res.json(info);
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

  const bookings = await Booking.find().populate("ground", "name type");

  let mainBooking = [];
  for (const ground of grounds) {
    for (const booking of bookings) {
      if (
        String(booking.ground._id) == String(ground._id) &&
        booking.screenshot == true
      ) {
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

    const formattedDate = new Date(booking.date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    await transporterMain.sendMail({
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

  const formattedDate = new Date(booking.date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  await transporterMain.sendMail({
    from: APP_EMAIL,
    to: booking.email,
    subject: "Booking rejected",
    text: `dear ${booking.name} your booking for ground ${booking.ground.name} on ${formattedDate} has been rejected because of "${info.reason}" as stated by the owner of the ground, for further query please contact the owner at number ${admin.contact}`,
  });
  await transporterMain.sendMail({
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
    const link = `${allowedOrigin[0]}/admin/changePassword/${admin._id}`;
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
