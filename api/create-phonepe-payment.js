export const config = {
  runtime: "nodejs",
};

import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { amount } = req.body;

    // 🔑 Replace with your actual values
    const merchantId = process.env.PHONEPE_MERCHANT_ID;
    const saltKey = process.env.PHONEPE_SALT_KEY;
    const saltIndex = process.env.PHONEPE_SALT_INDEX || "1";
    const callbackUrl = process.env.PHONEPE_CALLBACK_URL;

    const transactionId = uuidv4();

    const payload = {
      merchantId,
      transactionId,
      merchantUserId: "MUID123",
      amount: amount * 100, // convert to paise
      redirectUrl: callbackUrl,
      redirectMode: "POST",
      callbackUrl,
      paymentInstrument: {
        type: "PAY_PAGE",
      },
    };

    const payloadString = JSON.stringify(payload);
    const base64Payload = Buffer.from(payloadString).toString("base64");

    const stringToHash = base64Payload + "/pg/v1/pay" + saltKey;
    const sha256 = crypto.createHash("sha256").update(str
