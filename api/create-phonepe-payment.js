import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";

export default async function handler(request, response) {
  // Only handle POST requests
  if (request.method !== "POST") {
    return response.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    // --- CONFIGURATION ---
    const merchantId = process.env.PHONEPE_MERCHANT_ID;
    const saltKey = process.env.PHONEPE_SALT_KEY;
    const saltIndex = process.env.PHONEPE_SALT_INDEX;

    // PhonePe UAT (sandbox) endpoint
    const phonepeEndpoint =
      "https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay";

    // --- DATA FROM FRONTEND ---
    const amount = parseInt(request.body.amount) * 100; // convert to paise
    const userId = "MUID123"; // unique user ID (can come from frontend)

    // --- TRANSACTION DATA ---
    const merchantTransactionId = uuidv4();

    // --- REDIRECT URL ---
    const redirectUrl = "https://hakunamatatagamingcafe.site/success.html";

    // Main payload for PhonePe
    const payload = {
      merchantId: merchantId,
      merchantTransactionId: merchantTransactionId,
      merchantUserId: userId,
      amount: amount,
      redirectUrl: redirectUrl,
      redirectMode: "REDIRECT",
      callbackUrl: redirectUrl,
      mobileNumber: "9999999999", // TODO: replace with real number from user
      paymentInstrument: {
        type: "PAY_PAGE",
      },
    };

    // --- CHECKSUM ---
    const base64Payload = Buffer.from(JSON.stringify(payload)).toString("base64");
    const stringToHash = base64Payload + "/pg/v1/pay" + saltKey;
    const sha256 = crypto.createHash("sha256").update(stringToHash).digest("hex");
    const checksum = sha256 + "###" + saltIndex;

    // --- API REQUEST ---
    const options = {
      method: "post",
      url: phonepeEndpoint,
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
        "X-VERIFY": checksum,
      },
      data: {
        request: base64Payload,
      },
    };

    const phonepeResponse = await axios.request(options);

    // --- RESPONSE TO FRONTEND ---
    const paymentUrl =
      phonepeResponse.data.data.instrumentResponse.redirectInfo.url;

    response.status(200).json({ redirectUrl: paymentUrl });
  } catch (error) {
    console.error(error);
    response
      .status(500)
      .json({ message: "Error processing payment", error: error.message });
  }
}
