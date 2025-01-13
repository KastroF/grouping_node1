const Notification = require("../models/Notification"); 


exports.readNotifications = async (req, res) => {
  
  try{
      
    await Notification.updateMany({receiverId: req.auth.userId}, {$set: {view: true}}); 
    
    res.status(200).json({status: 0})
    
  }catch(err){
    
    console.log(err); 
    res.status(505).json({err})
  }
  
    
}