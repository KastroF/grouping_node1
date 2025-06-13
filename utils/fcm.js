const { GoogleAuth } = require("google-auth-library");
const axios = require("axios");

const MY_PROJECT_ID = "grouping-94f5a";
const FCM_ENDPOINT = `https://fcm.googleapis.com/v1/projects/${MY_PROJECT_ID}/messages:send`;
const SERVICE_ACCOUNT_KEY_FILE = "./my-service-account.json";

async function getAccessToken() {
  const auth = new GoogleAuth({
    keyFile: SERVICE_ACCOUNT_KEY_FILE,
    scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
  });
  return await auth.getAccessToken();
}

async function sendPushNotification(token, title, body, badge, data = {}) {
  const accessToken = await getAccessToken();

  const messagePayload = {
    validate_only: false,
    message: {
      token,
      notification: { title, body },
      apns: {
        payload: { aps: { alert: { title, body }, badge } }
      },
      data,
    },
  };

  try {
    const response = await axios.post(FCM_ENDPOINT, messagePayload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });
    console.log("📩 Notification envoyée :", response.data);
  } catch (error) {
    console.error("⚠️ Erreur notification :", error.response?.data || error.message);
  }
}

module.exports = { sendPushNotification };
