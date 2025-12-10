import { APP_EMAIL, APP_PASS } from "../../config.js";
import multer from "multer";
import { Admin, Booking, BookingData, Challenges, Ground } from "../../db.js";
import nodemailer from "nodemailer";
import axios from "axios";
import { base_delete_user } from "../../index.js";
import { transporterMain } from "../admin/adminManage.js";
import fs from "fs";

// const bfsPublicKey = fs.readFileSync("./bfs_public_key.pem", "utf8");
import {
  formatTimestamp,
  generateBFSChecksum,
  generateNumericOrderNumber,
  generateOtp,
  verifyBFSAC,
} from "../../lib.js";
import Redis from "ioredis";

const redis = new Redis({
  host: "127.0.0.1", // or "localhost"
  port: 6379,
});
const upload = multer({ storage: multer.memoryStorage() });
export const fetchGrounds = async (req, res) => {
  const grounds = await Ground.find({});
  if (grounds.length == 0) {
    return res.status(404).send("No grounds available");
  }

  return res.json({ ground: grounds });
};
export const viewGrounduser = async (req, res) => {
  const id = req.params.id;

  const ground = await Ground.findOne({ _id: id });

  if (ground.length == 0) {
    return res.send("no such ground exists");
  }

  return res.send(ground);
};

export const bookGround = async (req, res) => {
  const id = req.params.id;
  console.log("id", id);
  const userDate = new Date(req.body.date);
  const day = userDate.getDay();
  const ground = await Ground.findById(id);
  if (!ground) {
    return res.json({ msg: "Ground doesnt exists" });
  }

  const bookingdata = await req.body.data;
  const times = bookingdata.availability;
  let total = 0;
  for (const time of times) {
    if (
      parseInt(time.start.replace(":", ""), 10) >=
      parseInt(ground.nightime.replace(":", ""), 10)
    ) {
      if (day == 0 || day == 6) {
        total += ground.weekendNightPrice;
      } else {
        total += ground.nightprice;
      }
    } else {
      if (day == 0 || day == 6) {
        total += ground.weekendPrice;
      } else {
        total += ground.pricePerHour;
      }
    }
  }
  try {
    const bookings = await Booking.create({
      date: bookingdata.date,
      name: bookingdata.name,
      email: bookingdata.email,
      contact: bookingdata.phone,
      time: bookingdata.availability,
      status: "PENDING",
      screenshot: false,
      ground: ground._id,
      amount: total,
      expiresAt: new Date(Date.now() + 6 * 60 * 1000),
    });
    console.log("booking", bookings);
    if (!bookings) {
      return res.status(400).json({ msg: "booking failed please try again" });
    }
    const otp = generateOtp();
    const fullDetail = {
      otp,
      groundId: ground._id,
      screenshoot: false,
    };
    await redis.set(`otp:${bookingdata.email}`, otp, "EX", 90);
    transporterMain.sendMail({
      from: APP_EMAIL,
      to: bookingdata.email,
      subject: "OTP",
      text: `Otp for your thanggo ground booking is ${otp}. it is valid for 1 minute.`,
    });
    return res.json({ msg: "bookign done", booking_id: bookings._id });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ msg: "internal server error", err: error.message });
  }
};
export const resendOtp = async (req, res) => {
  const { email } = req.body;
  const otp = generateOtp();
  await redis.set(`otp:${email}`, otp, "EX", 90);
  transporterMain.sendMail({
    from: APP_EMAIL,
    to: email,
    subject: "OTP",
    text: `Otp for your thanggo ground booking is ${otp}. it is valid for 1 minute.`,
  });
  return res
    .status(200)
    .json({ message: "OTP send successfully to your email" });
};
export const verifyOtp = async (req, res) => {
  const { email, otp, id } = req.body;
  if (!email || !otp)
    return res.status(400).json({ message: "Make a booking first" });
  const booking = await Booking.findOne({ _id: id });
  const storedOtp = await redis.get(`otp:${email}`);
  if (!storedOtp)
    return res.status(400).json({ message: "OTP expired or not found" });

  if (storedOtp == otp) {
    await redis.del(`otp:${email}`); // remove OTP after verification
    return res.status(200).json({ id: booking._id });
  } else {
    return res.status(400).json({ message: "Invalid OTP" });
  }
};
export const verifyChallengesOtp = async (req, res) => {
  const { email, otp, id } = req.body;
  if (!email || !otp)
    return res.status(400).json({ message: "Make a challenge first" });

  const storedOtp = await redis.get(`otp:${email}`);
  if (!storedOtp)
    return res.status(400).json({ message: "OTP expired or not found" });

  if (storedOtp == otp) {
    const challenge = await Challenges.findByIdAndUpdate(
      id,
      { valid: true },
      { new: true } // returns the updated document
    );

    await redis.del(`otp:${email}`); // remove OTP after verification
    return res.status(200).json({ msg: "done" });
  } else {
    return res.status(400).json({ message: "Invalid OTP" });
  }
};
export const bookinginfo = async (req, res) => {
  const id = req.params.id;
  console.log(id);
  const info = await Booking.findById(id).populate("ground", "name _id");

  const ground = await Ground.findById(info.ground._id).populate(
    "admin",
    "scanner"
  );
  if (!info) {
    return res.status(404).json({
      msg: "no info",
    });
  }
  return res.json({
    info: info,
    scanner: ground.admin.scanner,
  });
};
export const mailer = [
  upload.single("screenshot"), // 👈 expect "screenshot" field from FormData
  async (req, res) => {
    try {
      const { groundId, name, contactInfo, email, bookingId } = req.body;
      const file = req.file; // 👈 screenshot file is here (in memory)
      const booking = await Booking.findById(bookingId);
      if (!file) {
        return res.status(400).json({ error: "Screenshot is required" });
      }
      // compute expiresAt from last time slot
      const lastSlotEnd = booking.time[booking.time.length - 1].end; // "08:30"
      const bookingDate = new Date(booking.date);
      const [hours, minutes] = lastSlotEnd.split(":").map(Number);

      // Use UTC methods to avoid timezone shift
      bookingDate.setUTCHours(hours, minutes, 0, 0);

      const expiresAt = bookingDate;

      await Booking.updateOne(
        { _id: bookingId },
        { screenshot: true, $set: { expiresAt } }
      );
      const date = formatTimestamp(Date.now());
      const order_number = generateNumericOrderNumber(booking._id.toString());

      const privateKey = fs.readFileSync("./private_key.pem", "utf8");

      let armessage = {
        bfs_msgType: "AR",
        bfs_benfTxnTime: date,
        bfs_orderNo: order_number,
        bfs_benfId: "BE10000266",
        bfs_benfBankCode: "01",
        bfs_txnCurrency: "BTN",
        bfs_txnAmount: Number(booking.amount).toFixed(2),
        bfs_remitterEmail: booking.email,
        bfs_paymentDesc: encodeURIComponent("Sample Product Description"),
        bfs_version: "5.0",
      };

      const checksum = generateBFSChecksum(armessage, privateKey);
      armessage.bfs_checkSum = checksum;

      const ground = await Ground.findById(groundId).populate("admin", "_id");
      const admin = await Admin.findById(ground.admin._id);

      const bookingData = await BookingData.create({
        amount: booking.amount,
        time: booking.time,
        ground: groundId,
        status: booking.status,
        bookingId: bookingId,
        date: booking.date,
        email: booking.email,
        adminId: admin.email,
      });
      // 👉 Convert AR JSON to POST redirect form
      let formInputs = Object.entries(armessage)
        .map(
          ([key, value]) =>
            `<input type="hidden" name="${key}" value="${value}" />`
        )
        .join("");

      // 👉 Send HTML to auto-redirect user to BFS
      return res.send(`
        <html>
          <body onload="document.forms[0].submit()">
            <form method="POST" action="http://uatbfssecure.rma.org.bt/BFSSecure/nvpapi">
              ${formInputs}
            </form>
          </body>
        </html>
      `);
    } catch (err) {
      console.error(err);
      res
        .status(500)
        .json({ error: "Failed to send screenshot", err: err.message });
    }
  },
];

export const getTimeBooked = async (req, res) => {
  const bookings = await Booking.find({
    date: req.query.date,
    ground: req.query.ground,
  });

  if (bookings.length === 0) {
    return res.json({ msg: "no booking" });
  }

  const time = [];
  for (const booking of bookings) {
    time.push(...booking.time);
  }

  console.log(time);
  return res.json({ bookedTime: time });
};

export const createChallenge = async (req, res) => {
  const challengeInfo = req.body;

  const { teamName, availability, email, members, sport, description } =
    challengeInfo;
  const imageUrl = challengeInfo.imageUrl;

  try {
    let data = await Challenges.create({
      teamImage: imageUrl,
      teamName: teamName,
      availability: availability,
      sport,
      email,
      members,
      description,
      valid: false,
    });
    const otp = generateOtp();

    await redis.set(`otp:${data.email}`, otp, "EX", 90);
    transporterMain.sendMail({
      from: APP_EMAIL,
      to: data.email,
      subject: "OTP",
      text: `Otp for your thanggo challenge creation is ${otp}. it is valid for 1 minute.`,
    });
    return res.status(200).json({ msg: "done", id: data._id });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ msg: "not done" });
  }
};

export const sendChallenge = async (req, res) => {
  let challenges = await Challenges.find({ valid: true });

  return res.json({ challenges });
};

export const acceptChallenge = async (req, res) => {
  const { data, id } = req.body;

  const challenge = await Challenges.findById(id);
  console.log(challenge);
  if (!challenge) {
    return res.status(404).json({ msg: "challenge with this id doesnt exist" });
  }

  transporterMain.sendMail({
    from: APP_EMAIL,
    to: challenge.email,
    subject: "Challenge accepted",
    text: `Your challenge has been accepted by ${data.name} please contact the accepter on phone ${data.phone} or email ${data.email}`,
  });
  await axios.delete(`https://www.thanggo.com/api/photo/user/delete`, {
    data: { url: challenge.teamImage },
  });

  await Challenges.deleteOne({ _id: id });
  return res.json({ msg: "challenge accepted" });
};

export const seeDate = async (req, res) => {
  try {
    const { searchDate } = req.body;
    if (!searchDate) {
      return res.status(400).json({ error: "searchDate is required" });
    }

    const bookings = await Booking.find({ date: searchDate }).populate(
      "ground"
    );
    console.log("bookings:", bookings);

    const allGrounds = await Ground.find({});

    const availableGroundIds = [];

    for (const ground of allGrounds) {
      const groundBookings = bookings.filter(
        (b) => b.ground._id.toString() === ground._id.toString()
      );

      const bookedSlots = groundBookings.flatMap((b) => b.time);

      const freeSlots = ground.availability.filter((slot) => {
        return !bookedSlots.some(
          (booked) => booked.start === slot.start && booked.end === slot.end
        );
      });

      if (freeSlots.length > 0) {
        availableGroundIds.push(ground._id.toString());
      }
    }

    return res.status(200).json({ availableGroundIds });
  } catch (err) {
    console.error("Error in seeDate:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
export const contactUs = async (req, res) => {
  try {
    const { name, email, message } = req.body;

    // Basic validation
    if (!name || !email || !message) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Send mail
    await transporterMain.sendMail({
      from: APP_EMAIL, // sender info
      to: APP_EMAIL, // your app inbox
      subject: "📩 New Contact Form Submission",
      text: `You got a new message from your app:\n\nName: ${name}\nEmail: ${email}\nMessage: ${message}`,
      html: `
        <h3>New Contact Form Submission</h3>
        <p><b>Name:</b> ${name}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Message:</b> ${message}</p>
      `,
    });

    return res.status(200).json({ msg: "Message sent successfully!" });
  } catch (err) {
    console.error("Error sending contact message:", err);
    return res.status(500).json({ error: "Failed to send message" });
  }
};

export const cancelBooking = async (req, res) => {
  const { id } = req.body;
  const booking = await Booking.findById(id);
  if (!booking) {
    return res.status(404).json({ msg: "no such ground" });
  }
  await Booking.deleteOne({ _id: id });
  return res.status(400).json({ msg: "Booking reservation canceled" });
};
export const sendFeedback = async (req, res) => {
  const { rating, comment } = req.body;
  await transporterMain.sendMail({
    from: APP_EMAIL, // sender info
    to: APP_EMAIL, // your app inbox
    subject: "📩 New Feedback",
    text: `Rating and comment send by the user`,
    html: `
        <h3>New Contact Form Submission</h3>
        <p><b>Rating:</b> ${rating}</p>
        <p><b>Comment:</b> ${comment}</p>
       
      `,
  });
  return res.status(200).json({ msg: "Feedback submitted" });
};
export const bfsCallback = async (req, res) => {
  const rawResponse = req.body; // DO NOT parse JSON

  const isValid = verifyBFSAC(rawResponse, bfsPublicKey);

  if (!isValid) {
    console.log("❌ Invalid BFS signature — possible tampering!");
    return res.status(400).send("INVALID CHECKSUM");
  }

  console.log("✔ Valid BFS AC Message");

  // TODO: Persist booking status as confirmed payment here
  res.send("SUCCESS");
};
