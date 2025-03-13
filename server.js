const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken"); // JWT pour la vérification du token envoyé par socket.io
const app = require("./app");

const server = http.createServer(app);

const FIREBASE_API_URL = "https://fcm.googleapis.com/fcm/send";
const { GoogleAuth } = require("google-auth-library");
const fs = require("fs");
const axios = require("axios");
const Notification = require("./models/Notification")
const User = require("./models/User");
const MY_PROJECT_ID = "grouping-94f5a";
const FCM_ENDPOINT = `https://fcm.googleapis.com/v1/projects/${MY_PROJECT_ID}/messages:send`;

const SERVICE_ACCOUNT_KEY_FILE = "./my-service-account.json";

async function getAccessToken() {
  const auth = new GoogleAuth({
    keyFile: SERVICE_ACCOUNT_KEY_FILE,
    scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
  });

  const accessToken = await auth.getAccessToken();
  return accessToken;
}

async function sendPushNotification(token, title, body, badge, data = {}) {
  try {
    // Obtenir le jeton OAuth 2.0
    const accessToken = await getAccessToken();
    
    console.log("le token access", accessToken);

    // Construire la charge utile du message
    const messagePayload = {
      validate_only: false,
      message: {
        token,
        notification: {
          title: title,
          body: body,
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: title,
                body: body,
              },
              badge,
            },
          },
        },
        data: data, // Charge utile personnalisée
      },
    };

    // Envoyer la requête POST
    const response = await axios.post(FCM_ENDPOINT, messagePayload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    console.log("Notification envoyée avec succès :", response.data);
  } catch (error) {
    console.error(
      "Erreur lors de l’envoi de la notification :",
      error.response?.data.error.details[0] || error.message
    );
  }
}


// Clé secrète pour JWT (remplacer par une clé sécurisée dans un fichier d'env)
const JWT_SECRET =
  process.env.JWT_SECRET ||
  "JxqKuulLNPCNfytiyqtsygygfRJYTjgkbhilaebAqetflqRfhhouhpb";

const { addMessageweb } = require("./controllers/Message"); // Import du contrôleur d'ajout de message

// Configuration de Socket.IO
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Stockage des utilisateurs connectés
const connectedUsers = new Map();

// Middleware pour vérifier le token JWT
io.use((socket, next) => {
  const token = socket.handshake.auth?.token; // Récupérer le token des données d'authentification

  if (!token) {
    return next(new Error("Token manquant"));
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      console.error("Token invalide:", err);
      return next(new Error("Authentification échouée"));
    }

    // Ajouter l'ID de l'utilisateur décodé au socket
    socket.userId = decoded.userId;
    next();
  });
});

// Gestion des connexions Socket.IO
io.on("connection", (socket) => {
  console.log(`Utilisateur ${socket.userId} connecté`);

  // Ajouter l'utilisateur aux utilisateurs connectés
  connectedUsers.set(socket.userId, socket.id);
  console.log(connectedUsers)

  // Notifier les autres utilisateurs de l'état de connexion
  socket.broadcast.emit("userStatusChanged", {
    userId: socket.userId,
    status: "online",
    usersConnected : connectedUsers
  });

  // Rejoindre une room
  socket.on("joinRoom", ({ roomId1 }) => {
    //const roomId = [socket.userId, receiverId].sort().join("-");
    const roomId = roomId1;
    socket.join(roomId);
    console.log(`Utilisateur ${socket.userId} a rejoint la room : ${roomId}`);
  });

  // Gestion de l'envoi de messages
  socket.on("sendMessage", async ({ roomId1, receiverId, message, user1 }) => {
    const roomId = roomId1;
    const receiverSocketId = connectedUsers.get(receiverId);
    
   // console.log(message);

    const temporaryMessage = {
      text: message.text,
      date: new Date(),
      sender: message.sender,
      status: "pending",
    };

    // Émettre immédiatement le message à la room
    io.to(roomId).emit("messageReceived", temporaryMessage);

    try {
      const savedMessage = await addMessageweb({
        senderId: socket.userId,
        receiverId,
        text: message.text,
      });
    
  const sender = await User.findOne({_id: message.sender});
  const userr = await User.findOne({_id: receiverId});
      
      
  const badge = await Notification.countDocuments({receiverId, view: false})
      
  for(let token of userr.fcmToken){
    
     console.log("le fcm token", token.fcmToken); 
     console.log("le name", sender.name); 
     console.log("le message", message.text); 
     console.log("userId", socket.userId); 
     console.log("le badge", badge); 
            
    
            await sendPushNotification(token.fcmToken, sender.name , 
            `${message.text}`, 
            badge, {"status": `5`, senderId: socket.userId, "badge": `${badge}`})
  }

      // Mise à jour du statut du message
   const rooms = io.sockets.adapter.rooms;
    if (rooms.has(roomId)) {
      io.to(roomId).emit("messageStatusUpdate", {
        _id: savedMessage._id,
        status: "sent",
        text: savedMessage.text,
        user1Id: savedMessage.senderId,
      });
      
      
    } else {
      console.error(`Room ${roomId} introuvable ou aucun utilisateur n'est connecté.`);
    }
      
    /*  socket.emit("messageStatusUpdate", {
        _id: savedMessage._id,
        status: "sent",
        text: savedMessage.text, 
        senderId: savedMessage.senderId
      });*/

      if (receiverSocketId) {
        temporaryMessage.date = savedMessage.date;
        temporaryMessage.status = "sent";
        temporaryMessage._id = savedMessage._id;
        io.to(receiverSocketId).emit("newMessageNotification", {
          //const roomId = [user.uid, user1._id].sort().join("-");
          senderId: socket.userId,
          receiverId: savedMessage.user2Id,
          message: temporaryMessage,
          user: user1
        });
      }
    } catch (error) {
      console.error("Erreur lors de l'enregistrement du message:", error);
      socket.emit("messageError", {
        error: "Erreur lors de l'envoi du message",
      });
    }
  });

  // Gestion de la déconnexion
  socket.on("disconnect", () => {
    connectedUsers.delete(socket.userId);
    socket.broadcast.emit("userStatusChanged", {
      userId: socket.userId,
      status: "offline",
    });
    console.log(`Utilisateur ${socket.userId} déconnecté`, connectedUsers);
  });
});

const normalizePort = (val) => {
  const port = parseInt(val, 10);

  if (isNaN(port)) {
    return val;
  }
  if (port >= 0) {
    return port;
  }
  return false;
};
const port = normalizePort(process.env.PORT || "3000");
app.set("port", port);

const errorHandler = (error) => {
  if (error.syscall !== "listen") {
    throw error;
  }
  const address = server.address();
  const bind =
    typeof address === "string" ? "pipe " + address : "port: " + port;
  switch (error.code) {
    case "EACCES":
      console.error(bind + " requires elevated privileges.");
      process.exit(1);
      break;
    case "EADDRINUSE":
      console.error(bind + " is already in use.");
      process.exit(1);
      break;
    default:
      throw error;
  }
};

server.on("error", errorHandler);
server.on("listening", () => {
  const address = server.address();
  const bind = typeof address === "string" ? "pipe " + address : "port " + port;
  console.log("Listening on " + bind);
});

server.listen(port);