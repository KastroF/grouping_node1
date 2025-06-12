const express = require("express"); 

const router = express.Router(); 

const announcementCtrl = require("../controllers/Announcement"); 

const auth = require("../middleware/auth"); 
const multer = require("../middleware/multer-configs"); 
const multer2 = require("../middleware/multer-configs2"); 

router.post("/addannouncement", auth, multer, multer2, announcementCtrl.addAnnouncement); 
router.post("/addannouncementwithpdf", auth, multer, announcementCtrl.addAnnouncementWithPdf);
router.post("/addannouncementwithImages", auth, multer2, announcementCtrl.addAnnouncementWithImages)
router.get("/getannouncementbyid", auth, announcementCtrl.getAnnouncementsById); 
router.post("/announces", announcementCtrl.getAnnonces);
router.post("/moreannounces", auth, announcementCtrl.moreAnnouncements)
router.post("/getannonce", announcementCtrl.getAnnonce)
router.post("/getannoncee", announcementCtrl.getAnnoncee)
router.post("/search", auth, announcementCtrl.annoncesRecherche)
router.get("/getvalidannouncements", auth, announcementCtrl.getValidAnnouncements)
router.get("/getfalsecontainer", auth, announcementCtrl.getFalseContainer)
router.get("/getfalsekilo", auth, announcementCtrl.getFalseKilo)
router.get("/getconversionrate", auth, announcementCtrl.getConversionRate)
router.post("/updateactivecontainer", auth, announcementCtrl.toggleActiveStatus); 
router.post("/avoirlesannonces", announcementCtrl.avoirLesAnnonces);
router.post("/ajouterunconteneur", auth, multer2,  announcementCtrl.addAnnouncementWithImages);
router.post("/modifierkilo", auth, announcementCtrl.modifierUneAnnonceKilo);

module.exports = router; 


 
