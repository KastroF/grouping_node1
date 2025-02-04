const Message = require("../models/Messages");
const User = require("../models/User");
const Announcement = require("../models/Announcement");

exports.getMessages = async (req, res) => {
  //console.log(req.body);

  try {
    const messages = await Message.find({$or: [ {$and:[{user1Id: req.auth.userId}, {user2Id: req.body.user2}] }, {$and: [{user2Id: req.auth.userId}, {user1Id: req.body.user2}]}]
      
      
    })
      .sort({ date: -1 })
      .skip(req.body.startAt)
      .limit(10);
    
      await Message.updateMany({user2Id: req.body.user2}, {$set: {read: true}});

    const user = await User.findOne({ _id: req.body.user2 });

    const count = await Announcement.countDocuments({
      userId: req.body.user2,
      active: true,
    });

    res.status(200).json({
      status: 0,
      messages,
      user,
      startAt: messages.length === 10 ? parseInt(req.body.startAt) + 10 : null,
      count,
    });
  } catch (e) {
    console.log(e);
    res.status(505).json({ e });
  }
};

exports.getMessagesById = async (req, res) => {
  try {
    // Étape 1 : Récupérer les messages où l'utilisateur est soit user1Id soit user2Id
    const messages = await Message.find({
      $or: [{ user1Id: req.auth.userId }, { user2Id: req.auth.userId }],
    })
      .sort({ date: -1 })
      .skip(req.body.startAt)
      .limit(10);

    // Étape 2 : Extraire les identifiants user2Id et user1Id des messages sans doublon
    const userIds = [
      ...new Set([
        req.auth.userId, // Ajouter l'utilisateur actuel à la liste
        ...messages.map((message) => {
          return message.user1Id === req.auth.userId
            ? message.user2Id
            : message.user1Id;
        }),
      ]),
    ];

    // Étape 3 : Rechercher les utilisateurs correspondants
    const users = await User.find({ _id: { $in: userIds } });

    // Fonction pour regrouper les messages par expéditeur unique
    const groupMessagesBySender = (messages, users, currentUserId) => {
      const usersById = Object.fromEntries(
        users.map((user) => [user._id, user])
      );

      const grouped = messages.reduce((acc, msg) => {
        // Déterminer si l'utilisateur actuel est l'expéditeur du message
        const isCurrentUserSender = msg.user1Id === currentUserId;
        const otherUserId = isCurrentUserSender ? msg.user2Id : msg.user1Id;

        // Trouver l'autre utilisateur (celui qui n'est pas l'utilisateur actuel)
        const otherUser = usersById[otherUserId] || {
          name: "Utilisateur inconnu",
          photo: "",
        };

        // Vérifier si une conversation avec cet utilisateur existe déjà
        let conversation = acc.find((item) => item.user._id === otherUser._id);
        if (!conversation) {
          conversation = { user: otherUser, messages: [] };
          acc.push(conversation);
        }

        // Ajouter le message à la conversation correspondante, avec l'objet complet du sender
        conversation.messages.push({
          _id: msg._id,
          text: msg.text,
          date: msg.date,
          sender: isCurrentUserSender ? usersById[currentUserId] : otherUser,
        });

        return acc;
      }, []);

      return grouped;
    };

    // Utiliser la fonction pour regrouper les messages par expéditeur
    const groupedMessages = groupMessagesBySender(
      messages,
      users,
      req.auth.userId
    );

    // Retourner la réponse avec les messages regroupés
    res.status(200).json({ groupedMessages, status: 0 });
  } catch (e) {
    console.log(e);
    res.status(505).json({ e });
  }
};

exports.addMessage = async (req, res) => {
  //console.log(req.body, 'envoi du message en base de données');
  const newMessage = new Message({
    date: new Date(),
    text: req.body.text,
    user1Id: req.auth.userId,
    user2Id: req.body._id,
  });

  try {
    await newMessage.save();

    const messages = await Message.find({
      user1Id: req.auth.userId,
      user2Id: req.body._id,
    })
      .sort({ date: -1 })
      .skip(req.body.startAt)
      .limit(10);

    res.status(200).json({
      status: 0,
      messages,
      startAt: messages.length === 10 ? parseInt(req.body.startAt) + 10 : null,
    });
  } catch (e) {
    console.log(e);
    res.status(505).json({ e });
  }
};

// Ajout du message en temps reel avec retour du message sauvegardé
exports.addMessageweb = async ({ senderId, receiverId, text }) => {
  const newMessage = new Message({
    date: new Date(),
    text,
    user1Id: senderId,
    user2Id: receiverId,
  });

  try {
    return await newMessage.save(); // Retourne le message sauvegardé
    
  } catch (error) {
    console.error('Erreur lors de la sauvegarde du message :', error);
    throw error;
  }
};

//pour la version admin
exports.getConversationCount = async (req, res) => {
  try {
    // Trouver toutes les conversations distinctes en utilisant une agrégation MongoDB
    const conversationCount = await Message.aggregate([
      {
        $group: {
          _id: {
            user1: { $cond: [{ $lt: ["$user1Id", "$user2Id"] }, "$user1Id", "$user2Id"] },
            user2: { $cond: [{ $lt: ["$user1Id", "$user2Id"] }, "$user2Id", "$user1Id"] },
          },
        },
      },
      {
        $count: "totalConversations",
      },
    ]);

    // Si aucune conversation n'est trouvée, renvoyer 0
    const totalConversations = conversationCount[0]?.totalConversations || 0;

    res.status(200).json({
      status: 0,
      count: totalConversations,
      message: "Nombre de conversations calculé avec succès",
    });
  } catch (error) {
    console.error("Erreur lors du calcul du nombre de conversations :", error);
    res.status(500).json({
      status: 1,
      message: "Erreur lors du calcul du nombre de conversations",
      error,
    });
  }
};
