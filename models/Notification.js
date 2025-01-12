const mongoose =  require("mongoose");


const notificationSchema = mongoose.Schema({
  
    receiverId: {type: String}, 
    author_id: {type: String}, 
    title: {type: String}, 
    body: {type: String}, 
    date: {type: Date}, 
    read: {type: Boolean}, 
    view: {type: Boolean},
})


module.exports = mongoose.model("Notification", notificationSchema);