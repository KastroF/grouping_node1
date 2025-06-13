// sockets/chatSocket.js
const jwt = require("jsonwebtoken");
const { addMessageweb } = require("../controllers/Message");
const User = require("../models/User");
const Message = require("../models/Messages");
const Notification = require("../models/Notification");
const { sendPushNotification } = require("../utils/fcm"); // Tu déplaces ta logique FCM ici

const connectedUsers = new Map();

module.exports = function (io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Token manquant"));

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) return next(new Error("Token invalide"));
      socket.userId = decoded.userId;
      next();
    });
  });

  io.on("connection", (socket) => {
    console.log(`✅ ${socket.userId} connecté`);
    connectedUsers.set(socket.userId, socket.id);

    socket.broadcast.emit("userStatusChanged", {
      userId: socket.userId,
      status: "online",
      usersConnected: connectedUsers
    });

    socket.on("joinRoom", ({ roomId1 }) => {
      socket.join(roomId1);
      console.log(`➡️ ${socket.userId} a rejoint ${roomId1}`);
    });

    socket.on("sendMessage", async ({ roomId1, receiverId, message, user1 }) => {
      const roomId = roomId1;
      const receiverSocketId = connectedUsers.get(receiverId);

      const temporaryMessage = {
        text: message.text,
        date: new Date(),
        sender: message.sender,
        status: "pending",
      };

      io.to(roomId).emit("messageReceived", temporaryMessage);

      try {
        const savedMessage = await addMessageweb({
          senderId: socket.userId,
          receiverId,
          text: message.text,
        });

        const sender = await User.findById(message.sender);
        const userr = await User.findById(receiverId);
        const mess = await Message.countDocuments({ user2Id: receiverId, read: false });
        const badge = await Notification.countDocuments({ receiverId, view: false });
        const finalBadge = mess + badge;

        for (let token of userr.fcmToken || []) {
          await sendPushNotification(token.fcmToken, sender.name, message.text, finalBadge, {
            status: "5",
            senderId: socket.userId,
            badge: `${finalBadge}`,
          });
        }

        io.to(roomId).emit("messageStatusUpdate", {
          _id: savedMessage._id,
          status: "sent",
          text: savedMessage.text,
          user1Id: savedMessage.senderId,
        });

        if (receiverSocketId) {
          temporaryMessage.date = savedMessage.date;
          temporaryMessage.status = "sent";
          temporaryMessage._id = savedMessage._id;

          io.to(receiverSocketId).emit("newMessageNotification", {
            senderId: socket.userId,
            receiverId: savedMessage.user2Id,
            message: temporaryMessage,
            user: user1
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
      });
      console.log(`🔌 ${socket.userId} déconnecté`);
    });
  });
};
