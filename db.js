import mongoose from "mongoose";

const timeRangeSchema = new mongoose.Schema(
  {
    start: {
      type: String,
      required: true,
      match: /^([0-1]\d|2[0-3]):([0-5]\d)$/,
    },
    end: {
      type: String,
      required: true,
      match: /^([0-1]\d|2[0-3]):([0-5]\d)$/,
    },
  },
  { _id: false }
);

const adminSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Name is required"],
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
  },
  profile: {
    type: String,
    default: "https://stock.adobe.com/search?k=profile+icon",
  },
  contact: {
    type: [String],
    default: [],
  },
  contact: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: [true, "Password is required"],
    minlength: 6,
  },
});

const groundSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Ground name is required"],
  },
  address: {
    type: String,
    required: [true, "Address is required"],
  },
  images: {
    type: [String],
    default: [],
  },
  availability: {
    type: [timeRangeSchema],
    default: [],
  },
  description: {
    type: String,
  },
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin",
    required: true,
  },
});

const bookingSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true],
  },
  contact: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
  },
  time: {
    type: timeRangeSchema,
    required: true,
  },
  ground: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Ground",
    unique: true,
    required: true,
  },
});

export const Admin = mongoose.model("Admin", adminSchema);
export const Ground = mongoose.model("Ground", groundSchema);
export const Booking = mongoose.model("Booking", bookingSchema);
