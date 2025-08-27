import { APP_EMAIL, APP_PASS } from "../../config.js";
import multer from "multer";
import { Admin, Booking, Ground } from "../../db.js";
import nodemailer from "nodemailer";
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
  const ground = await Ground.findById(id);
  if (!ground) {
    return res.json({ msg: "Ground doesnt exists" });
  }

  const bookingdata = await req.body.data;
  console.log(bookingdata);
  try {
    const bookings = await Booking.create({
      date: bookingdata.date,
      name: bookingdata.name,
      email: bookingdata.email,
      contact: bookingdata.phone,
      time: bookingdata.availability,
      status: "PENDING",
      ground: ground._id,
      amount: ground.pricePerHour * bookingdata.availability.length,
    });
    if (!bookings) {
      return res.status(400).json({ msg: "booking failed please try again" });
    }
    return res.json({ msg: "booking info", booking_id: bookings._id });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ msg: "internal server error" });
  }
};

export const bookinginfo = async (req, res) => {
  const id = req.params.id;
  console.log(id);
  const info = await Booking.findById(id).populate("ground", "name _id");

  if (!info) {
    return res.status(404).json({
      msg: "no info",
    });
  }
  return res.json({
    info: info,
  });
};
export const mailer = [
  upload.single("screenshot"), // 👈 expect "screenshot" field from FormData
  async (req, res) => {
    try {
      const { groundId, name, contactInfo, email } = req.body;
      const file = req.file; // 👈 screenshot file is here (in memory)

      if (!file) {
        return res.status(400).json({ error: "Screenshot is required" });
      }

      const ground = await Ground.findById(groundId).populate("admin", "_id");
      const admin = await Admin.findById(ground.admin._id);

      const transporter = nodemailer.createTransport({
        service: "gmail", // or your SMTP
        auth: {
          user: APP_EMAIL,
          pass: APP_PASS,
        },
      });

      const attachment = {
        filename: file.originalname, // preserve user file name
        content: file.buffer, // use buffer (no base64 conversion)
        contentType: file.mimetype, // e.g. image/png, image/jpeg
      };

      // Email to Admin
      const adminMail = transporter.sendMail({
        from: APP_EMAIL,
        to: admin.email,
        subject: "Payment Screenshot",
        text: `Payment screenshot from ${name}, contact: ${contactInfo}, ground: ${groundId}`,
        attachments: [attachment],
      });

      // Confirmation Email to User
      const userMail = transporter.sendMail({
        from: APP_EMAIL,
        to: email,
        subject: "Payment Screenshot Confirmation",
        text: `Here is the payment screenshot you sent to the ground owner. The owner will verify your payment and confirm your booking. You will be notified via email once confirmed.`,
        attachments: [attachment],
      });

      // run in parallel
      await Promise.all([adminMail, userMail]);

      res.json({ message: "Screenshot sent successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to send screenshot" });
    }
  },
];

export const getTimeBooked = async (req, res) => {
  const bookings = await Booking.find({
    date: req.query.date,
    ground: req.query.ground,
  });
  console.log(bookings);
  if (bookings.length == 0) {
    return res.json({ msg: "no booking" });
  }
  const time = [];
  for (const booking of bookings) {
    time.push(booking.time);
  }
  console.log(time);
  return res.json({ bookedTime: time });
};
