import nodemailer from "nodemailer";
import crypto from "crypto";
import { APP_EMAIL, APP_PASS } from "./config.js";
import rateLimit from "express-rate-limit";

import querystring from "querystring";

/**
 * Generates BFS Secure checksum
 * @param {Object} data - BFS fields used in source string
 * @param {String} privateKey - Private key in PEM format
 * @returns {String} Hex checksum (uppercase)
 */
export function generateBFSChecksum(data, privateKey) {
  // Step 1a & 1b: sort by field name
  const sortedKeys = Object.keys(data).sort();

  // Step 1c: create source string
  const sourceString = sortedKeys.map((k) => data[k]).join("|");

  // Step 2: Sign (SHA1 + RSA + HEX)
  const signer = crypto.createSign("RSA-SHA1");
  signer.update(sourceString, "utf8");
  let signature = signer.sign(privateKey).toString("hex").toUpperCase();

  return signature;
}

export function toMinutes(str) {
  const [h, m] = str.split(":").map(Number);
  return h * 60 + m;
}
export const transporterMain = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: APP_EMAIL,
    pass: APP_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});
export const generateOtp = () => crypto.randomInt(100000, 999999).toString();
export const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  keyGenerator: (req) => req.body.email || "", // limit per email
  handler: (_, res) => {
    res
      .status(429)
      .json({ message: "Too many OTP requests. Try again later." });
  },
});

export function formatTimestamp(ts) {
  const d = new Date(ts);
  return (
    d.getFullYear().toString() +
    String(d.getMonth() + 1).padStart(2, "0") +
    String(d.getDate()).padStart(2, "0") +
    String(d.getHours()).padStart(2, "0") +
    String(d.getMinutes()).padStart(2, "0") +
    String(d.getSeconds()).padStart(2, "0")
  );
}
export function generateNumericOrderNumber(bookingId) {
  const date = new Date();

  const timestamp =
    date.getFullYear().toString() +
    String(date.getMonth() + 1).padStart(2, "0") +
    String(date.getDate()).padStart(2, "0") +
    String(date.getHours()).padStart(2, "0") +
    String(date.getMinutes()).padStart(2, "0") +
    String(date.getSeconds()).padStart(2, "0");

  // Converts ObjectId hex → Decimal number string
  const numericId = BigInt("0x" + bookingId).toString();

  // random digits just to ensure uniqueness
  const random = Math.floor(Math.random() * 1e8)
    .toString()
    .padStart(8, "0");

  // combine and limit to 40 digits max
  const order = `${timestamp}${numericId}${random}`.substring(0, 40);
  return order;
}

/**
 * Strict BFS AC verification according to official spec
 * @param {String} responseQueryString - Raw URL encoded AC message
 * @param {String} publicKey - BFS PUBLIC KEY in PEM format
 * @returns {Boolean} true if valid, false if tampered
 */

export function verifyBFSAC(data, publicKey) {
  const bfsOrder = [
    "bfs_msgType",
    "bfs_bfsTxnId",
    "bfs_bfsTxnTime",
    "bfs_benfTxnTime",
    "bfs_orderNo",
    "bfs_benfId",
    "bfs_txnCurrency",
    "bfs_txnAmount",
    "bfs_remitterName",
    "bfs_remitterBankId",
    "bfs_debitAuthCode",
    "bfs_debitAuthNo",
  ];

  const checksumHex = data.bfs_checkSum;
  if (!checksumHex) return false;

  const signature = Buffer.from(checksumHex, "hex");

  const sourceString = bfsOrder.map((k) => data[k] ?? "").join("|");

  // Try SHA256 then SHA1
  for (const alg of ["RSA-SHA256", "RSA-SHA1"]) {
    const verifier = crypto.createVerify(alg);
    verifier.update(sourceString, "utf8");
    if (verifier.verify(publicKey, signature)) {
      return { valid: true, alg, sourceString };
    }
  }

  return { valid: false, sourceString };
}
