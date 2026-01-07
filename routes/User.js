 const express = require("express"); 

const router = express.Router(); 


const userCtrl = require("../controllers/User"); 
const auth = require("../middleware/auth");
const { handleUpload } = require("../middleware/multer");


//router.get("/adduser", userCtrl.SignUp);

router.post("/adduser", userCtrl.Register); 
router.post("/register", userCtrl.signUpp);
router.post("/signinwithgoogle", userCtrl.signInWithGoogle); 
router.post("/signinwithgoogleadmin", userCtrl.signInWithGoogleAdmin); 
router.post("/appleinfo", userCtrl.appleInfo);
router.post("/signin", userCtrl.signIn);
router.post("/signinAdmin", userCtrl.signInAdmin);
router.post("/getallusers", auth, userCtrl.getAllUsers)
router.post("/togglelockstatus", auth, userCtrl.toggleLockStatus)
router.post("/addadmin", auth, handleUpload, userCtrl.addUser); 
router.post("/connectwithapple", userCtrl.connectWithApple);
router.post("/updatefcmToken", auth, userCtrl.updateFcmToken); 
router.post("/changename", auth, userCtrl.changeName);
router.post("/changephoto", auth, handleUpload, userCtrl.changePhoto);
router.post("/changepassword", auth, userCtrl.changePassword);
router.post("/gotoemail", userCtrl.goToEmail);
router.post("/updateemail", userCtrl.updateEmail); 
router.post("/contactus", auth, userCtrl.contactUs)

module.exports = router;