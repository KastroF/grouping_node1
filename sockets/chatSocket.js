// sockets/chatSocket.js
const jwt = require("jsonwebtoken");
const { addMessageweb } = require("../controllers/Message");
const User = require("../models/User");
const Message = require("../models/Messages");
const Notification = require("../models/Notification");
const { sendPushNotification } = require("../utils/fcm");

const connectedUsers = new Map();

module.exports = function chatSocket(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Token manquant"));

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) return next(new Error("Token invalide"));
      socket.userId = String(decoded.userId);
      next();
    });
  });

  io.on("connection", (socket) => {
    console.log(`✅ ${socket.userId} connecté`);
    connectedUsers.set(socket.userId, socket.id);

    socket.broadcast.emit("userStatusChanged", {
      userId: socket.userId,
      status: "online",
      usersConnected: Array.from(connectedUsers.keys()),
    });

    socket.on("joinRoom", ({ roomId1 }) => {
      if (!roomId1) return;
      socket.join(roomId1);
      console.log(`➡️ ${socket.userId} a rejoint ${roomId1}`);
    });

    socket.on("sendMessage", async ({ roomId1, receiverId, message, user1, url, id, clientId }) => {
      const roomId = roomId1;
      if (!roomId || !receiverId) return;

      const safeClientId = clientId || `${Date.now()}`;
      const senderId = String(socket.userId);
      const receiverIdStr = String(receiverId);

      const text = message?.text ? String(message.text) : "";

      // ✅ pending (toujours sender string)
      const pendingMessage = id
        ? {
            clientId: safeClientId,
            text,
            url,
            type: "image",
            date: new Date(),
            sender: senderId,
            status: "pending",
          }
        : {
            clientId: safeClientId,
            text,
            date: new Date(),
            sender: senderId,
            status: "pending",
          };

      // pending -> seulement au sender
      socket.emit("messageReceived", pendingMessage);

      try {
        // 1) Save DB (source of truth: socket.userId)
        const savedMessage = await addMessageweb(
          {
            senderId,
            receiverId: receiverIdStr,
            text,
          },
          id
        );

        // 2) Message final (sent) -> room
        const finalMessage = {
          ...pendingMessage,
          _id: String(savedMessage._id),
          date: savedMessage.date || new Date(),
          status: "sent",
          sender: String(savedMessage.senderId), // ✅ string
        };

        io.to(roomId).emit("messageReceived", finalMessage);

        // 3) Update pending -> sent (sender uniquement)
        socket.emit("messageStatusUpdate", {
          clientId: safeClientId,
          _id: String(savedMessage._id),
          status: "sent",
          date: finalMessage.date,
          sender: finalMessage.sender,
        });

        // 4) Push notif FCM
        const sender = await User.findById(senderId);
        const receiver = await User.findById(receiverIdStr);

        const unreadMessages = await Message.countDocuments({ user2Id: receiverIdStr, read: false });
        const unreadNotifications = await Notification.countDocuments({ receiverId: receiverIdStr, view: false });
        const finalBadge = unreadMessages + unreadNotifications;

        const tokens = (receiver?.fcmToken || [])
          .map((t) => (typeof t === "string" ? t : t?.fcmToken))
          .filter(Boolean);

        for (const t of tokens) {
          await sendPushNotification(
            t,
            sender?.name || "Nouveau message",
            id ? "Vous a envoyé une image" : text,
            finalBadge,
            { status: "5", senderId, badge: String(finalBadge) }
          );
        }

        // 5) Notification socket directe si receiver online
        const receiverSocketId = connectedUsers.get(receiverIdStr);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("newMessageNotification", {
            senderId,
            receiverId: receiverIdStr,
            message: finalMessage,
            user: user1,
          });
        }
      } catch (err) {
        console.error("❌ Enregistrement message:", err);
        socket.emit("messageError", { error: "Erreur lors de l'envoi du message" });
      }
    });

    socket.on("disconnect", () => {
      connectedUsers.delete(socket.userId);

      socket.broadcast.emit("userStatusChanged", {
        userId: socket.userId,
        status: "offline",
        usersConnected: Array.from(connectedUsers.keys()),
      });

      console.log(`🔌 ${socket.userId} déconnecté`);
    });
  });
};
