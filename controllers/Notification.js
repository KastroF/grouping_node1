const Notification = require("../models/Notification"); 
const Message = require("../models/Messages");

exports.viewNotifications = async (req, res) => {
  
  try{
      
    await Notification.updateMany({receiverId: req.auth.userId}, {$set: {view: true}}); 
    
    res.status(200).json({status: 0})
    
  }catch(err){
    
    console.log(err); 
    res.status(505).json({err})
  }
  
    
}

exports.getNotReadNotifications = async(req, res) => {
    
  
    
    try{
      
      const badges = await Notification.countDocuments({receiverId: req.auth.userId, read: false}); 
      
      res.status(201).json({status: 0, badges});
      
    }catch(err){
      
        console.log(err); 
        res.status(505).json({err})
    }
}

exports.getNotifications = async (req, res) => {
  
  const startAt = req.body.startAt ? req.body.startAt : 0;
  const userId = req.auth.userId; 
  
    try{
        
      const notifs = await  Notification.find({receiverId: req.auth.userId, authorId: "grouping", desactived: false}).sort({date: -1}).limit(3);
      
      
      
    const pipeline = [
      // Étape 1 : Filtrer les messages où user2Id correspond à userId
      {
        $match: {
          user2Id: userId, // Filtrer uniquement les messages pertinents
        },
      },
      // Étape 2 : Trier les messages par date décroissante
      {
        $sort: { date: -1 },
      },
      // Étape 3 : Sauter les messages déjà parcourus
      {
        $skip: startAt,
      },
      // Étape 4 : Lier les messages aux utilisateurs via user1Id (string -> ObjectId)
     {
        $addFields: {
          user1ObjectId: { $toObjectId: "$user1Id" },
        },
      },
      // Étape 5 : Lier les messages aux utilisateurs via user1ObjectId
      {
        $lookup: {
          from: "users", // Nom de la collection des utilisateurs
          localField: "user1ObjectId", // Champ converti en ObjectId
          foreignField: "_id", // Champ dans les utilisateurs
          as: "user",
        },
      },
      // Étape 5 : Déstructurer le tableau "user" pour obtenir un objet utilisateur unique
      {
        $unwind: "$user",
      },
      // Étape 6 : Grouper les messages par utilisateur pour trouver uniquement le premier message de chaque utilisateur
      {
        $group: {
          _id: "$user._id", // Grouper par ID utilisateur
          firstMessage: { $first: "$$ROOT" }, // Conserver le premier message trouvé
        },
      },
      // Étape 7 : Limiter à 10 utilisateurs distincts
      {
        $limit: 10,
      },
    ];

    // Exécuter l'agrégation
    const result = await Message.aggregate(pipeline);

    // Étape 8 : Calculer l'indice d'arrêt
    const stopIndex = startAt + result.length;

    // Vérifier si tous les messages ont été parcourus sans atteindre 10 utilisateurs
    const endReached = result.length < 10;
      
      
      res.status(200).json({status: 0, notifs, messages: result.map((r) => ({
        user: r.firstMessage.user,
        firstMessage: r.firstMessage,
      })),
      startAt: endReached ? null : stopIndex,}); 
      
    }catch(err){
      
        console.log(err); 
        res.status(505).json({err})
    }
   
}

exports.deleteNotif = (req, res) => {
  
    
}