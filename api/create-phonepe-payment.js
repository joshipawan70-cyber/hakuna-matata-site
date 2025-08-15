// File: /api/create-phonepe-payment.js

const crypto = require('crypto');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

export default async function handler(request, response) {
  // We only want to handle POST requests
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // --- CONFIGURATION ---
    // Get these from Vercel Environment Variables
    const merchantId = process.env.PHONEPE_MERCHANT_ID;
    const saltKey = process.env.PHONEPE_SALT_KEY;
    const saltIndex = process.env.PHONEPE_SALT_INDEX;

    // The PhonePe API endpoint. Use the UAT (testing) URL first.
    // Production URL: https://api.phonepe.com/apis/hermes
    const phonepeEndpoint = 'https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay';

    // --- DATA FROM FRONTEND ---
    // We'll get the amount from the frontend request
    const amount = parseInt(request.body.amount) * 100; // Amount in paise
    const userId = 'MUID123'; // A unique ID for the customer

    // --- TRANSACTION DATA ---
    const merchantTransactionId = uuidv4(); // Generate a unique transaction ID

    // --- REDIRECT URLS ---
    // The user will be redirected to this URL after payment
    // IMPORTANT: Make sure this domain matches your final domain on Vercel
    const redirectUrl = 'https://hakunamatatagamingcafe.site/success.html'; 

    // The main data payload for PhonePe
    const payload = {
      merchantId: merchantId,
      merchantTransactionId: merchantTransactionId,
      merchantUserId: userId,
      amount: amount,
      redirectUrl: redirectUrl,
      redirectMode: 'REDIRECT',
      callbackUrl: redirectUrl, // This URL receives the payment status from PhonePe
      mobileNumber: '9999999999', // Can be collected from user on the frontend
      paymentInstrument: {
        type: 'PAY_PAGE',
      },
    };

    // --- CHECKSUM CALCULATION ---
    const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
    const stringToHash = base64Payload + '/pg/v1/pay' + saltKey;
    const sha256 = crypto.createHash('sha256').update(stringToHash).digest('hex');
    const checksum = sha256 + '###' + saltIndex;

    // --- MAKE THE API REQUEST ---
    const options = {
      method: 'post',
      url: phonepeEndpoint,
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
        'X-VERIFY': checksum,
      },
      data: {
        request: base64Payload,
      },
    };

    const phonepeResponse = await axios.request(options);

    // --- SEND RESPONSE TO FRONTEND ---
    // Send the payment URL back to your website
    const paymentUrl = phonepeResponse.data.data.instrumentResponse.redirectInfo.url;
    response.status(200).json({ redirectUrl: paymentUrl });

  } catch (error) {
    console.error(error);
    response.status(500).json({ message: 'Error processing payment', error: error.message });
  }
}
