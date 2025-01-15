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
  
    try{
        
      const notifs = await  Notification.find({receiverId: req.auth.userId, authorId: "grouping"}).sort({date: -1}).limit(3);
      
      
      
      const messages = await Message.find({$or: [{user1Id: req.auth.userId}, {user2Id: req.auth.userId }]}).sort({date: -1}).skip(startAt).limit(10); 
      
      
      res.status(200).json({status: 0, notifs, messages, startAt: messages.length === 10 ? parseInt(startAt) + 10 : null}); 
      
    }catch(err){
      
        console.log(err); 
        res.status(505).json({err})
    }
   
}