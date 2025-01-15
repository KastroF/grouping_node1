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
        
      const notifs = await  Notification.find({receiverId: req.auth.userId, authorId: "grouping"}).sort({date: -1}).limit(3);
      
      
      
         const pipeline = [
      // Filtrer les messages selon les conditions user1Id ou user2Id
      {
        $match: {
          $or: [
            { user1Id: userId },
            { user2Id: userId },
          ],
        },
      },

      // Tri des messages par date décroissante
      { $sort: { date: -1 } },

      // Sauter les messages déjà parcourus
      { $skip: startAt },

      // Regrouper les messages par utilisateur unique
      {
        $group: {
          _id: {
            user: {
              $cond: [
                { $eq: ["$user1Id", userId] },
                "$user2Id",
                "$user1Id",
              ],
            },
          }, // Grouper par utilisateur distinct
          firstMessage: { $first: "$$ROOT" }, // Conserver le premier message trouvé pour ce user
        },
      },

      // Ajouter les détails des utilisateurs
      {
        $lookup: {
          from: "users", // Collection users
          localField: "_id.user",
          foreignField: "_id",
          as: "userDetails",
        },
      },

      // Transformer les détails de l'utilisateur en un objet
      {
        $addFields: {
          userDetails: { $arrayElemAt: ["$userDetails", 0] },
        },
      },

      // Limiter à 10 utilisateurs distincts
      { $limit: 10 },
    ];

    // Exécuter le pipeline d'agrégation
    const results = await Message.aggregate(pipeline);

    // Obtenir l'indice de fin
    const distinctUserIds = new Set(results.map((res) => res._id.user));
    const totalMessagesParsed = startAt + results.length;

    // Vérifier si on a parcouru tous les messages sans atteindre 10 utilisateurs distincts
    const hasMoreMessages = distinctUserIds.size < 10;
      
      
      res.status(200).json({status: 0, notifs, messages: results.map((res) => ({
        user: res.userDetails,
        message: res.firstMessage,
      })),
      startAt: hasMoreMessages ? totalMessagesParsed : null}); 
      
    }catch(err){
      
        console.log(err); 
        res.status(505).json({err})
    }
   
}