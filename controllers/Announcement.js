const Announcement = require("../models/Announcement");
const City = require("../models/City");
const User = require("../models/User");
const mongoose = require("mongoose");
const { ObjectId } = require("mongodb");
const View = require("../models/View");
const FIREBASE_API_URL = "https://fcm.googleapis.com/fcm/send";
const { GoogleAuth } = require("google-auth-library");
const fs = require("fs");
const http = require("https");
const axios = require("axios");
const Notification = require("../models/Notification")
const Search = require("../models/Search"); 


const MY_PROJECT_ID = process.env.FIREBASEPROJECTID
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

exports.modifierUneAnnonceKilo = async (req, res) => {
  
  console.log(req.body);
  
    try{
      
          let body = req.body; 
          const {_id} = req.body; 

          delete body._id; 

          await Announcement.updateOne({_id}, {$set: body}); 

          res.status(200).json({status: 0, message: 1}); 
      
      
    }catch(err){
      
        console.log(err); 
        res.status(500).json({err  })
    }
  
    
}


exports.ajouterUnConteneur = (req, res) => {
  
    console.log(req.body);
    console.log(req.files);
    res.status(200).json({status: 0, message: 1})
}

exports.avoirLesAnnonces = async (req, res) => {
  const startAt = req.body.startAt ? req.body.startAt : 0;

  try {
    const { status } = req.body;
    const filter = {
      active: true,
      status: status === "c" ? "container" : "kilos",
      dateOfDeparture: { $gte: new Date() },
    };

    const result = await Announcement.aggregate([
      { $match: filter },

      // 🔥 Joindre l'utilisateur créateur
      {
        $lookup: {
          from: "users",          // nom de la collection
          localField: "userId",   // champ dans Announcement
          foreignField: "_id",    // champ dans User
          as: "user",
        },
      },
      { $unwind: "$user" }, // optionnel : enlève le tableau

      {
        $facet: {
          total: [{ $count: "count" }],
          annonces: [
            { $sort: { date: -1 } },
            { $skip: startAt },
            { $limit: 10 },
          ],
        },
      },
    ]);

    const total = result[0]?.total[0]?.count || 0;
    const annonces = result[0]?.annonces || [];

    // 🌍 Récupérer les villes
    const cityNames = [
      ...new Set([
        ...annonces.map((c) => c.startCity),
        ...annonces.map((c) => c.endCity),
      ]),
    ];

    const cities = await City.find({ name: { $in: cityNames } });
    const cityMap = new Map(cities.map((city) => [city.name, city]));

    // Injecter startCity2 et endCity2
    annonces.forEach((annonce) => {
      annonce.startCity2 = cityMap.get(annonce.startCity);
      annonce.endCity2 = cityMap.get(annonce.endCity);
    });

    res.status(200).json({
      status: 0,
      annonces,
      total,
      startAt: annonces.length === 10 ? parseInt(req.body.startAt) + 10 : null,
    });
  } catch (err) {
    console.log(err);
    res.status(505).json({ err });
  }
};


/*
exports.addAnnouncementWithPdf = (req, res) => {
  
 
  const draft = [`${req.protocol}s://${req.get("host")}/pdf_documents/${req.file.filename}`];
  //console.log(draft);
  
   const dateOfDeparture = new Date(req.body.dateOfDeparture);  
  // Conversion de coords en objet JSON
  const coords = req.body.coords ? JSON.parse(req.body.coords) : null;
  
       const announcement = new Announcement({
        startCity: req.body.startCity, 
        endCity: req.body.endCity, 
        dateOfDeparture: dateOfDeparture, 
        draft,
        pieds: req.body.pieds,
        description: req.body.description, 
        userId: req.auth.userId, 
        status: "container", 
        date: new Date(), 
        active: false,
        coords: coords
    })
       
    announcement.save().then(() => {
      
      res.status(201).json({status: 0});
        
    }, (err) => {
      
        console.log(err); 
      res.status(505).json({err})
    })
      
  
}


exports.addAnnouncementWithImages = (req, res) => {
       // Vérification que req.files existe et est un tableau
    if (!req.files || !Array.isArray(req.files)) {
        return res.status(400).json({ error: 'Aucun fichier téléchargé' });
    }
  
     // console.log(req.files); 
      //console.log(req.body); 
  
      let draft = []; 
  
      for(let file of req.files){
        
          draft.push(`${req.protocol}s://${req.get("host")}/images/${file.filename}`)
      }
  
  const dateOfDeparture = new Date(req.body.dateOfDeparture);
  // Conversion de coords en objet JSON
  const coords = req.body.coords ? JSON.parse(req.body.coords) : null;
  
       const announcement = new Announcement({
       
        startCity: req.body.startCity, 
        endCity: req.body.endCity, 
        dateOfDeparture: dateOfDeparture, 
        draft,
        pieds: req.body.pieds,
        description: req.body.description, 
        userId: req.auth.userId, 
        status: "container", 
        date: new Date(), 
        active: false,
        coords: coords
        
    })
       
    announcement.save().then(() => {
      
      res.status(201).json({status: 0});
        
    }, (err) => {
      
        console.log(err); 
      res.status(505).json({err})
    })
  
      
}


exports.addAnnouncement = (req, res) => {
 
  if (req.body.status === "kilos") {
    
    //console.log("la dix", req.body);

    // Convertir dateOfDeparture en objet Date
    const dateOfDeparture = new Date(req.body.dateOfDeparture);

    const announcement = new Announcement({
      startCity: req.body.startCity,
      endCity: req.body.endCity,
      startCity2: req.body.startCity2,
      endCity2: req.body.endCity2,
      dateOfDeparture: dateOfDeparture, // Convertir en Date
      kilosCount: req.body.kilosCount,
      kiloPrice: req.body.kiloPrice,
      company: req.body.company,
      description: req.body.description,
      pieds: req.body.pieds,
      userId: req.auth.userId,
      status: req.body.status,
      date: new Date(), // Date actuelle
      active: true,
      priceKilo: req.body.priceKilo || null, // Par défaut à null si non fourni
      coords: req.body.coords || null
    });

    announcement.save()
      .then(() => {
      
        res.status(201).json({ status: 0});
      
      })
      .catch((err) => {
        console.error("Erreur lors de la sauvegarde de l'annonce:", err);
        res.status(500).json({ error: err.message });
      });
  } else {
    console.log(req.body);
    console.log(req.file);
  }
}; */

exports.getAnnouncementsById = async (req, res) => {
  try {
    const userId = req.auth.userId;

    // 🔥 Récupération containers + user
    const containers = await Announcement.aggregate([
      {
        $match: {
          userId: userId,
          active: true,
          status: "container",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      { $sort: { date: -1 } },
      { $limit: 6 },
    ]);

    // 🔥 Récupération kilos + user
    const kilos = await Announcement.aggregate([
      {
        $match: {
          userId: userId,
          active: true,
          status: "kilos",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      { $sort: { date: -1 } },
      { $limit: 6 },
    ]);

    // 📌 Récupérer toutes les villes à trouver d’un coup
    const cityNames = [
      ...new Set([
        ...containers.map((c) => c.startCity),
        ...containers.map((c) => c.endCity),
        ...kilos.map((k) => k.startCity),
        ...kilos.map((k) => k.endCity),
      ]),
    ];

    const cities = await City.find({ name: { $in: cityNames } });
    const cityMap = new Map(cities.map((c) => [c.name, c]));

    // 📌 Injecter les villes
    containers.forEach((a) => {
      a.startCity2 = cityMap.get(a.startCity);
      a.endCity2 = cityMap.get(a.endCity);
    });

    kilos.forEach((a) => {
      a.startCity2 = cityMap.get(a.startCity);
      a.endCity2 = cityMap.get(a.endCity);
    });

    res.status(200).json({
      status: 0,
      containers,
      kilos,
      startAt: containers.length === 6 ? 6 : null,
      startBt: kilos.length === 6 ? 6 : null,
    });
  } catch (err) {
    console.log(err);
    res.status(505).json({ err });
  }
};


exports.moreAnnouncements = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { status, skip } = req.body;

    // 🔥 Récupérer les annonces + l'utilisateur
    const annonces = await Announcement.aggregate([
      {
        $match: {
          userId: userId,
          active: true,
          status: status,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      { $sort: { date: -1 } },
      { $skip: parseInt(skip) },
      { $limit: 6 },
    ]);

    // 📌 Récupérer toutes les villes nécessaires
    const cityNames = [
      ...new Set([
        ...annonces.map((a) => a.startCity),
        ...annonces.map((a) => a.endCity),
      ]),
    ];

    const cities = await City.find({ name: { $in: cityNames } });
    const cityMap = new Map(cities.map((c) => [c.name, c]));

    // Injecter startCity2 et endCity2
    annonces.forEach((a) => {
      a.startCity2 = cityMap.get(a.startCity);
      a.endCity2 = cityMap.get(a.endCity);
    });

    res.status(200).json({
      status: 0,
      annonces,
      skip: annonces.length === 6 ? parseInt(skip) + 6 : null,
      z: annonces.length,
    });

  } catch (e) {
    console.log(e);
    res.status(505).json({ e });
  }
};


exports.getAnnoncess = async (req, res) => {
  try {
    const currentDate = new Date();
    const limit = req.body.three ? 3 : 60;

    // 🔥 Containers avec utilisateur
    const containers = await Announcement.aggregate([
      {
        $match: {
          active: true,
          status: "container",
          dateOfDeparture: { $gte: currentDate },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      { $sort: { date: 1 } },
      { $limit: limit },
    ]);

    // 🔥 Kilos avec utilisateur
    const kilos = await Announcement.aggregate([
      {
        $match: {
          active: true,
          status: "kilos",
          dateOfDeparture: { $gte: currentDate },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      { $sort: { date: -1 } },
      { $limit: limit },
    ]);

    // 🌍 Récupérer toutes les villes nécessaires
    const cityNames = [
      ...new Set([
        ...containers.map((c) => c.startCity),
        ...containers.map((c) => c.endCity),
        ...kilos.map((k) => k.startCity),
        ...kilos.map((k) => k.endCity),
      ]),
    ];

    const cities = await City.find({ name: { $in: cityNames } });
    const cityMap = new Map(cities.map((city) => [city.name, city]));

    // Injecter les villes dans containers
    containers.forEach((container) => {
      container.startCity2 = cityMap.get(container.startCity);
      container.endCity2 = cityMap.get(container.endCity);
    });

    // Injecter les villes dans kilos
    kilos.forEach((kilo) => {
      kilo.startCity2 = cityMap.get(kilo.startCity);
      kilo.endCity2 = cityMap.get(kilo.endCity);
    });

    res.status(200).json({ status: 0, kilos, containers });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAnnoncee = async (req, res) => {
  try {
    const { id, phoneId } = req.body;

    // 🔥 1) Récupérer l’annonce + l’utilisateur
    const annonceResult = await Announcement.aggregate([
      { 
        $match: { 
          _id: new ObjectId(id), 
          active: true 
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user"
        }
      },
      { $unwind: "$user" }
    ]);

    if (!annonceResult.length) {
      return res.status(200).json({ status: 1 });
    }

    let annonce = annonceResult[0];

    // 🔥 2) Gestion de la vue unique
    const view = await View.findOne({
      announcementId: id,
      phoneId: phoneId,
    });

    if (!view) {
      await View.create({
        announcementId: id,
        phoneId: phoneId,
        date: new Date(),
      });

      // 🔥 Incrémente proprement les vues (atomic update)
      await Announcement.updateOne(
        { _id: id },
        { $inc: { views: 1 } }
      );

      annonce.views = (annonce.views || 0) + 1;
    }

    // 🌍 3) Charger les villes en 1 seule requête
    const cityNames = [annonce.startCity, annonce.endCity];

    const cities = await City.find({ name: { $in: cityNames } });
    const cityMap = new Map(cities.map((c) => [c.name, c]));

    annonce.startCity2 = cityMap.get(annonce.startCity);
    annonce.endCity2 = cityMap.get(annonce.endCity);

    // 🔥 4) Nombre d’annonces de l’utilisateur
    const sum = await Announcement.countDocuments({
      userId: annonce.user._id,
      active: true,
    });

    // 📤 5) Réponse finale
    return res.status(200).json({
      status: 0,
      annonce,
      sum,
      user: annonce.user,
    });

  } catch (e) {
    console.log(e);
    res.status(505).json({ e });
  }
};

/*function monthNameToNumber(monthName) {
  const monthNames = [
    'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
  ];

  const monthIndex = monthNames.indexOf(monthName.toLowerCase());
  return monthIndex >= 0 ? monthIndex + 1 : null;
}

*/
exports.annoncesRecherche = async (req, res) => {
  try {
    const { start, end, month, year, type, startAt } = req.body;

    // Convertir le mois texte → numéro
    const monthNumber = monthNameToNumber(month);

    let startDate;

    // 🔥 Si la recherche est pour le mois actuel → commencer maintenant
    if (
      year === new Date().getFullYear() &&
      monthNumber - 1 === new Date().getMonth()
    ) {
      startDate = new Date();
    } else {
      startDate = new Date(year, monthNumber - 1, 1);
    }

    const endDate = new Date(year, monthNumber, 1);

    // ------------------------------
    // 🔥 1) Compter toutes les annonces
    // ------------------------------

    const annoncesCount = await Announcement.countDocuments({
      startCity: start,
      endCity: end,
      status: type,
      active: true,
      dateOfDeparture: { $gte: startDate, $lt: endDate },
    });

    // ------------------------------
    // 🔥 2) Récupérer annonces + user
    // ------------------------------

    const annonces = await Announcement.aggregate([
      {
        $match: {
          startCity: start,
          endCity: end,
          status: type,
          active: true,
          dateOfDeparture: { $gte: startDate, $lt: endDate },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      { $sort: { date: 1 } },
      { $skip: parseInt(startAt) || 0 },
      { $limit: 10 },
    ]);

    // ------------------------------
    // 🔥 3) Load villes en une seule requête
    // ------------------------------

    const cityNames = [
      ...new Set([
        ...annonces.map(a => a.startCity),
        ...annonces.map(a => a.endCity),
      ]),
    ];

    const cities = await City.find({ name: { $in: cityNames } });
    const cityMap = new Map(cities.map(c => [c.name, c]));

    annonces.forEach(a => {
      a.startCity2 = cityMap.get(a.startCity);
      a.endCity2 = cityMap.get(a.endCity);
    });

    // ------------------------------
    // 🔥 4) Réponse finale
    // ------------------------------

    res.status(200).json({
      status: 0,
      annonces,
      count: annoncesCount,
      startAt: annonces.length === 10 ? parseInt(startAt) + 10 : null,
    });

  } catch (e) {
    console.log(e);
    res.status(505).json({ e });
  }
};


//version admin

exports.getValidAnnouncements = async (req, res) => {
  try {
    // Récupérer la date actuelle
    const currentDate = new Date();

    // Trouver toutes les annonces avec une date de départ valide
    const validAnnouncements = await Announcement.find({
      dateOfDeparture: { $gt: currentDate }, // Filtrer les annonces avec une date de départ future
    });

    res.status(200).json({
      status: 0,
      announcements: validAnnouncements,
      message: "Annonces valides récupérées avec succès",
    });
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des annonces valides :",
      error
    );
    res.status(500).json({
      status: 1,
      message: "Erreur lors de la récupération des annonces valides",
      error,
    });
  }
};

exports.getFalseContainer = async (req, res) => {
  try {
    const currentDate = new Date(); // Date actuelle

    // Récupérer les annonces avec status "container", active à false, et date de départ valide
    const inactiveContainers = await Announcement.find({
      status: "container",
      active: false,
      dateOfDeparture: { $gt: currentDate }, // Vérifie que la date est future
    });

    res.status(200).json({
      status: 0,
      announcements: inactiveContainers,
      message:
        "Annonces inactives 'container' avec des dates valides récupérées avec succès",
    });
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des annonces inactives :",
      error
    );
    res.status(500).json({
      status: 1,
      message: "Erreur lors de la récupération des annonces inactives",
      error,
    });
  }
};

exports.getFalseKilo = async (req, res) => {
  try {
    const currentDate = new Date(); // Date actuelle

    // Récupérer les annonces avec status "kilos", active à false, et date de départ valide
    const inactiveKilo = await Announcement.find({
      status: "kilos",
      active: false,
      dateOfDeparture: { $gt: currentDate }, // Vérifie que la date est future
    });

    res.status(200).json({
      status: 0,
      announcements: inactiveKilo,
      message:
        "Annonces inactives 'kilos' avec des dates valides récupérées avec succès",
    });
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des annonces inactives :",
      error
    );
    res.status(500).json({
      status: 1,
      message: "Erreur lors de la récupération des annonces inactives",
      error,
    });
  }
};

exports.getConversionRate = async (req, res) => {
  try {
    // Récupérer le nombre total d'utilisateurs
    const totalUsers = await User.countDocuments();

    // Récupérer le nombre d'utilisateurs ayant posté au moins une annonce
    const usersWithAnnouncements = await Announcement.distinct("userId");

    // Calculer le taux de conversion
    const conversionRate =
      totalUsers > 0
        ? ((usersWithAnnouncements.length / totalUsers) * 100).toFixed(2)
        : 0;

    res.status(200).json({
      status: 0,
      conversionRate: `${conversionRate}`,
      totalUsers,
      usersWithAnnouncements: usersWithAnnouncements.length,
      message: "Taux de conversion calculé avec succès",
    });
  } catch (error) {
    console.error("Erreur lors du calcul du taux de conversion :", error);
    res.status(500).json({
      status: 1,
      message: "Erreur lors du calcul du taux de conversion",
      error,
    });
  }
};

exports.toggleActiveStatus = async (req, res) => {
  try {
    const { id } = req.body;

    // Vérifier si l'ID est fourni
    if (!id) {
      return res.status(400).json({
        status: 1,
        message: "L'identifiant de l'annonce est requis.",
      });
    }

    // Utiliser `findByIdAndUpdate` pour réduire le nombre d'opérations
    const announcement = await Announcement.findById(id);

    // Vérifier si l'annonce existe
    if (!announcement) {
      return res.status(404).json({
        status: 1,
        message: "Annonce non trouvée.",
      });
    }

    const update = {};
    if (announcement.active) {
      // Si active est true, on le passe à false et on ajoute locked
      update.active = false;
      update.locked = true;
    } else {
      // Si active est false, on le passe à true et on retire locked
      update.active = true;
      update.$unset = { locked: "" }; // Utiliser $unset pour supprimer `locked`
    }

    // Appliquer les modifications
    const updatedAnnouncement = await Announcement.findByIdAndUpdate(
      id,
      update,
      { new: true } // Retourner l'objet mis à jour
    );

    res.status(200).json({
      status: 0,
      message: "Statut 'active' mis à jour avec succès.",
      announcement: updatedAnnouncement,
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour du statut 'active' :", error);
    res.status(500).json({
      status: 1,
      message: "Erreur lors de la mise à jour du statut 'active'.",
      error,
    });
  }
};

exports.addAnnouncementWithPdf = async (req, res) => {
  
  console.log(req.body);
  
  try{
  const draft = [
    `${req.protocol}s://${req.get("host")}/pdf_documents/${req.file.filename}`,
  ];
  //console.log(draft);

  const dateOfDeparture = new Date(req.body.dateOfDeparture);
    
    console.log(req.body.dateOfDeparture);
    
  // Conversion de coords en objet JSON
  const coords = req.body.coords ? JSON.parse(req.body.coords) : null;

  const announcement = new Announcement({
    startCity: req.body.startCity,
    endCity: req.body.endCity,
    dateOfDeparture: dateOfDeparture,
    draft,
    pieds: req.body.pieds,
    description: req.body.description,
    userId: req.auth.userId,
    fileName: req.body.fileName, 
    fileType: req.body.fileType,
    status: "container",
    date: new Date(),
    active: false,
    coords: coords,
  });
    
 
    
      
  console.log("month", new Date(dateOfDeparture).getMonth() + 2)
    
  announcement.save().then(
    async (annoncee) => {
      
      res.status(201).json({ status: 0 });
    },
    (err) => {
      console.log(err);
      res.status(505).json({ err });
    }
  );
    
  }catch(err){
    
      console.log(err); 
      
  }
}; 

exports.modifierAnnonceImage = async (req, res) => {
  
     
  
      try{
               console.log("On se concentre", req.body);
                console.log(req.file);
               console.log("Yes");
              if ((!req.files || !Array.isArray(req.files)) && !req.file) {
                return res.status(400).json({ error: "Aucun fichier téléchargé" });
            }

            // console.log(req.files);
            //console.log(req.body);

            let draft = [];
        
              
        
            if(req.file){
              
              console.log("On y est");
              
                draft.push(`${req.protocol}s://${req.get("host")}/pdf_documents/${req.file.filename}`);
               
              
            }else{
              
                  console.log("On y est pas");
              
              for (let file of req.files) {
                draft.push(`${req.protocol}s://${req.get("host")}/images/${file.filename}`);
              }
              
              
              
            }


        
            console.log(draft);
            let body = req.body; 
            const {_id} = req.body; 
           
        
            body = {...body, active: false, draft, modifyDate: new Date()}
        
            console.log("le body", body);
        
            delete body._id; 
        
            await Announcement.updateOne({_id}, {$set: body}); 
        
            res.status(200).json({status: 0})

      }catch(err){
        
          console.log(err); 
          res.status(505).json({err})
      }
  

}

exports.addAnnouncementWithImages = (req, res) => {
  // Vérification que req.files existe et est un tableau
  console.log(req.body);
  if (!req.files || !Array.isArray(req.files)) {
    return res.status(400).json({ error: "Aucun fichier téléchargé" });
  }

  // console.log(req.files);
  //console.log(req.body);

  let draft = [];

  for (let file of req.files) {
    draft.push(`${req.protocol}s://${req.get("host")}/images/${file.filename}`);
  }

  const dateOfDeparture = new Date(req.body.dateOfDeparture);
  // Conversion de coords en objet JSON
  const coords = req.body.coords ? JSON.parse(req.body.coords) : null;

  const announcement = new Announcement({
    startCity: req.body.startCity,
    endCity: req.body.endCity,
    dateOfDeparture: dateOfDeparture,
    draft,
    pieds: req.body.pieds,
    description: req.body.description,
    userId: req.auth.userId,
    status: "container",
    fileName: req.body.fileName, 
    fileType: req.body.fileType,
    date: new Date(),
    active: false,
    coords: coords,
  });

  announcement.save().then(
    () => {
      res.status(201).json({ status: 0 });
    },
    (err) => {
      console.log(err);
      res.status(505).json({ err });
    }
  );
};

exports.addAnnouncement = (req, res) => {
  
  if (req.body.status === "kilos") {
    //console.log("la dix", req.body);

    // Convertir dateOfDeparture en objet Date
    const dateOfDeparture = new Date(req.body.dateOfDeparture);
    
   // console.log(req.body);

    const announcement = new Announcement({
      startCity: req.body.startCity,
      endCity: req.body.endCity,
      startCity2: req.body.startCity2,
      endCity2: req.body.endCity2,
      dateOfDeparture: dateOfDeparture, // Convertir en Date
      kilosCount: req.body.kilosCount,
      kiloPrice: req.body.kiloPrice,
      company: req.body.company,
      description: req.body.description,
      pieds: req.body.pieds,
      userId: req.auth.userId,
      status: req.body.status,
      date: new Date(), // Date actuelle
      active: true,
      devise: req.body.devise,
      priceKilo: req.body.priceKilo || null, // Par défaut à null si non fourni
      coords: req.body.coords || null,
    });

    announcement
      .save()
      .then(async (annoncee) => {
      
        console.log("depart", req.body.startCity); 
        console.log("depart", req.body.endCity); 
        console.log("depart", (new Date(dateOfDeparture).getMonth() + 1).toString()); 
        console.log("depart", new Date(dateOfDeparture).getFullYear().toString()); 
      
          const search = await Search.findOne({startCity: req.body.startCity, endCity: req.body.endCity, status: "kilos",
          year: new Date(dateOfDeparture).getFullYear().toString(), $or: [{month: (new Date(dateOfDeparture).getMonth()).toString()}, {month: (new Date(dateOfDeparture).getMonth() + 1).toString()}]});

      console.log("la recherche", search);
      
      
  if(search){
    
      const userr = await User.findOne({_id: search.userId});
     
      
      const newNotif = Notification({
        
        title: "Bonne nouvelle", 
        body: "Un container correspondant à une de vos recherche a été trouvé", 
        date: new Date(), 
        read: false, 
        view: false,
        receiverId: userr._id, 
        authorId: "grouping", 
        annonceId: annoncee._id
      })
      
      await newNotif.save();
    
     const badgee = await Notification.countDocuments({read: false, receiverId: userr._id})
    
      console.log("le bon truc ", badgee);
    //  console.log()
    
      for(let tokennn of userr.fcmToken){
        
          await sendPushNotification(tokennn.fcmToken, "Bonne nouvelle", "Un container correspondant à une de vos recherche a été trouvé", badgee, {annonceId: annoncee._id, "status": `1`, "badge": `${badgee}`} )
      
      }
    
  }
        
        res.status(201).json({ status: 0 });
      })
      .catch((err) => {
        console.error("Erreur lors de la sauvegarde de l'annonce:", err);
        res.status(500).json({ error: err.message });
      });
  } else {
    console.log(req.body);
    console.log(req.file);
  }
};
exports.getAnnouncementsById = async (req, res) => {
  console.log("On respecte ça");

  try {
    const userId = req.auth.userId;

    // Marquer les annonces et notifications comme lues
    await Promise.all([
      Announcement.updateMany(
        { userId, active: true },
        { $set: { read: true } }
      ),
      Notification.updateMany(
        { receiverId: userId, title: "Félicitations" },
        { $set: { read: true } }
      )
    ]);

    // Récupération des annonces
    const containers = await Announcement.find({
      userId,
      active: true,
      status: "container",
    })
      .sort({ date: -1 })
      .limit(6)
      .lean();

    const kilos = await Announcement.find({
      userId,
      active: true,
      status: "kilos",
    })
      .sort({ date: -1 })
      .limit(6)
      .lean();

    // Liste de toutes les villes nécessaires
    const cityNames = [
      ...containers.flatMap(a => [a.startCity, a.endCity]),
      ...kilos.flatMap(a => [a.startCity, a.endCity])
    ];

    const uniqueCities = [...new Set(cityNames)];

    // Récupération des villes en une seule requête
    const cities = await City.find({ name: { $in: uniqueCities } }).lean();

    const cityMap = {};
    cities.forEach(city => cityMap[city.name] = city);

    // Enrichissement
    const enrich = (annonces) =>
      annonces.map(a => ({
        ...a,
        startCity2: cityMap[a.startCity] || null,
        endCity2: cityMap[a.endCity] || null
      }));

    res.status(200).json({
      status: 0,
      kilos: enrich(kilos),
      containers: enrich(containers),
      startAt: containers.length === 6 ? 6 : null,
      startBt: kilos.length === 6 ? 6 : null,
    });

  } catch (err) {
    console.log(err);
    res.status(505).json({ err });
  }
};

exports.moreAnnouncements = async (req, res) => {
  try {
    const { status, skip } = req.body;
    const userId = req.auth.userId;

    // Charger les annonces
    const annonces = await Announcement.find({
      userId,
      active: true,
      status,
    })
      .sort({ date: -1 })
      .skip(skip)
      .limit(6)
      .lean();

    // Construire la liste unique des villes
    const cityNames = annonces.flatMap(a => [a.startCity, a.endCity]);
    const uniqueCities = [...new Set(cityNames)];

    // Récupérer toutes les villes en une seule requête
    const cities = await City.find({ name: { $in: uniqueCities } }).lean();

    const cityMap = {};
    cities.forEach(c => (cityMap[c.name] = c));

    // Enrichir les annonces
    const enriched = annonces.map(a => ({
      ...a,
      startCity2: cityMap[a.startCity] || null,
      endCity2: cityMap[a.endCity] || null,
    }));

    res.status(200).json({
      status: 0,
      annonces: enriched,
      skip: annonces.length === 6 ? parseInt(skip) + 6 : null,
      z: annonces.length,
    });
  } catch (e) {
    console.log(e);
    res.status(505).json({ e });
  }
};

exports.getAnnonces = async (req, res) => {
  try {
    const currentDate = new Date();
    const limit = req.body.three ? 3 : 60;

    // -----------------------------
    // 1) Récupérer les containers avec l'utilisateur
    // -----------------------------
    const containers = await Announcement.aggregate([
      {
        $match: {
          active: true,
          status: "container",
          dateOfDeparture: { $gte: currentDate },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      { $sort: { date: -1 } },
      { $limit: limit },
    ]);

    // -----------------------------
    // 2) Récupérer les kilos avec l'utilisateur
    // -----------------------------
    const kilos = await Announcement.aggregate([
      {
        $match: {
          active: true,
          status: "kilos",
          dateOfDeparture: { $gte: currentDate },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      { $sort: { date: -1 } },
      { $limit: limit },
    ]);

    // -----------------------------
    // 3) Récupérer toutes les villes nécessaires en 1 requête
    // -----------------------------
    const cityNames = [
      ...new Set([
        ...containers.map((c) => c.startCity),
        ...containers.map((c) => c.endCity),
        ...kilos.map((k) => k.startCity),
        ...kilos.map((k) => k.endCity),
      ]),
    ];

    const cities = await City.find({ name: { $in: cityNames } });
    const cityMap = new Map(cities.map((city) => [city.name, city]));

    const enrichCities = (annonces) =>
      annonces.map((a) => ({
        ...a,
        startCity2: cityMap.get(a.startCity) || null,
        endCity2: cityMap.get(a.endCity) || null,
      }));

    // -----------------------------
    // 4) Répondre avec les données traitées
    // -----------------------------
    res.status(200).json({
      status: 0,
      containers: enrichCities(containers),
      kilos: enrichCities(kilos),
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
};



exports.getAnnonce = async (req, res) => {
  try {
    const { id } = req.body;

    // 🔹 1) Récupérer l'annonce avec l'utilisateur
    const annonceResult = await Announcement.aggregate([
      { $match: { _id: new ObjectId(id) } },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
    ]);

    if (!annonceResult.length) {
      return res.status(404).json({ status: 1, message: "Annonce non trouvée" });
    }

    const annonce = annonceResult[0];

    // 🔹 2) Récupérer les villes en une seule requête
    const cityNames = [annonce.startCity, annonce.endCity];
    const cities = await City.find({ name: { $in: cityNames } }).lean();
    const cityMap = new Map(cities.map((c) => [c.name, c]));

    annonce.startCity2 = cityMap.get(annonce.startCity) || null;
    annonce.endCity2 = cityMap.get(annonce.endCity) || null;

    // 🔹 3) Compter toutes les annonces actives de l'utilisateur
    const sum = await Announcement.countDocuments({
      userId: annonce.user._id,
      active: true,
    });

    // 🔹 4) Réponse
    res.status(200).json({ status: 0, annonce, sum, user: annonce.user });
  } catch (e) {
    console.log(e);
    res.status(500).json({ e });
  }
};

function monthNameToNumber(monthName) {
  const monthNames = [
    "janvier",
    "février",
    "mars",
    "avril",
    "mai",
    "juin",
    "juillet",
    "août",
    "septembre",
    "octobre",
    "novembre",
    "décembre",
  ];

  const monthIndex = monthNames.indexOf(monthName.toLowerCase());
  return monthIndex >= 0 ? monthIndex + 1 : null;
}
exports.annoncesRecherche = async (req, res) => {
  try {
    const { start, end, month: monthName, year, type, startAt = 0 } = req.body;
    const userId = req.auth.userId;

    // Convertir le nom du mois en numéro
    const month = monthNameToNumber(monthName);

    // Déterminer la date de début
    let startDate;
    const currentDate = new Date();
    if (year === currentDate.getFullYear() && month - 1 === currentDate.getMonth()) {
      startDate = currentDate;
    } else {
      startDate = new Date(year, month - 1, 1);
    }

    const endDate = new Date(year, month, 1);

    // -----------------------------
    // 1) Compter les annonces
    // -----------------------------
    const annoncesCount = await Announcement.countDocuments({
      startCity: start,
      endCity: end,
      status: type,
      active: true,
      dateOfDeparture: { $gte: startDate, $lt: endDate },
    });

    // -----------------------------
    // 2) Récupérer les annonces avec utilisateur
    // -----------------------------
    const annonces = await Announcement.aggregate([
      {
        $match: {
          startCity: start,
          endCity: end,
          status: type,
          active: true,
          dateOfDeparture: { $gte: startDate, $lt: endDate },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      { $sort: { date: 1 } },
      { $skip: parseInt(startAt) },
      { $limit: 10 },
    ]);

    // -----------------------------
    // 3) Récupérer les villes en une seule requête
    // -----------------------------
    const cityNames = [
      ...new Set(
        annonces.flatMap(a => [a.startCity, a.endCity])
      ),
    ];

    const cities = await City.find({ name: { $in: cityNames } }).lean();
    const cityMap = new Map(cities.map(c => [c.name, c]));

    const enrichedAnnonces = annonces.map(a => ({
      ...a,
      startCity2: cityMap.get(a.startCity) || null,
      endCity2: cityMap.get(a.endCity) || null,
    }));

    // -----------------------------
    // 4) Créer un Search si aucune annonce
    // -----------------------------
    if (enrichedAnnonces.length === 0) {
      const newSearch = new Search({
        startCity: start,
        endCity: end,
        month,
        year,
        status: type,
        userId,
        date: new Date(),
      });
      await newSearch.save();
    }

    // -----------------------------
    // 5) Réponse finale
    // -----------------------------
    res.status(200).json({
      status: 0,
      annonces: enrichedAnnonces,
      count: annoncesCount,
      startAt: enrichedAnnonces.length === 10 ? parseInt(startAt) + 10 : null,
    });

  } catch (e) {
    console.log(e);
    res.status(500).json({ e });
  }
};


//version admin

exports.getValidAnnouncements = async (req, res) => {
  try {
    const currentDate = new Date();

    // 🔹 1) Récupérer les annonces valides avec l'utilisateur
    const validAnnouncements = await Announcement.aggregate([
      { $match: { dateOfDeparture: { $gt: currentDate } } },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      { $sort: { dateOfDeparture: 1 } }, // trie par date de départ croissante
    ]);

    // 🔹 2) Récupérer les villes en une seule requête
    const cityNames = [
      ...new Set(
        validAnnouncements.flatMap(a => [a.startCity, a.endCity])
      ),
    ];

    const cities = await City.find({ name: { $in: cityNames } }).lean();
    const cityMap = new Map(cities.map(c => [c.name, c]));

    const enrichedAnnouncements = validAnnouncements.map(a => ({
      ...a,
      startCity2: cityMap.get(a.startCity) || null,
      endCity2: cityMap.get(a.endCity) || null,
    }));

    // 🔹 3) Réponse
    res.status(200).json({
      status: 0,
      announcements: enrichedAnnouncements,
      message: "Annonces valides récupérées avec succès",
    });
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des annonces valides :",
      error
    );
    res.status(500).json({
      status: 1,
      message: "Erreur lors de la récupération des annonces valides",
      error,
    });
  }
};


exports.getFalseContainer = async (req, res) => {
  try {
    const currentDate = new Date(); // Date actuelle

    // Récupérer les annonces avec status "container", active à false, et date de départ valide
    const inactiveContainers = await Announcement.find({
      status: "container",
      active: false,
      dateOfDeparture: { $gt: currentDate }, // Vérifie que la date est future
    });

    res.status(200).json({
      status: 0,
      announcements: inactiveContainers,
      message:
        "Annonces inactives 'container' avec des dates valides récupérées avec succès",
    });
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des annonces inactives :",
      error
    );
    res.status(500).json({
      status: 1,
      message: "Erreur lors de la récupération des annonces inactives",
      error,
    });
  }
};

exports.getFalseKilo = async (req, res) => {
  try {
    const currentDate = new Date(); // Date actuelle

    // Récupérer les annonces avec status "kilos", active à false, et date de départ valide
    const inactiveKilo = await Announcement.find({
      status: "kilos",
      active: false,
      dateOfDeparture: { $gt: currentDate }, // Vérifie que la date est future
    });

    res.status(200).json({
      status: 0,
      announcements: inactiveKilo,
      message:
        "Annonces inactives 'kilos' avec des dates valides récupérées avec succès",
    });
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des annonces inactives :",
      error
    );
    res.status(500).json({
      status: 1,
      message: "Erreur lors de la récupération des annonces inactives",
      error,
    });
  }
};

exports.getConversionRate = async (req, res) => {
  try {
    // Récupérer le nombre total d'utilisateurs
    const totalUsers = await User.countDocuments();

    // Récupérer le nombre d'utilisateurs ayant posté au moins une annonce
    const usersWithAnnouncements = await Announcement.distinct("userId");

    // Calculer le taux de conversion
    const conversionRate =
      totalUsers > 0
        ? ((usersWithAnnouncements.length / totalUsers) * 100).toFixed(2)
        : 0;

    res.status(200).json({
      status: 0,
      conversionRate: `${conversionRate}`,
      totalUsers,
      usersWithAnnouncements: usersWithAnnouncements.length,
      message: "Taux de conversion calculé avec succès",
    });
  } catch (error) {
    console.error("Erreur lors du calcul du taux de conversion :", error);
    res.status(500).json({
      status: 1,
      message: "Erreur lors du calcul du taux de conversion",
      error,
    });
  }
};

exports.toggleActiveStatus = async (req, res) => {
  try {
    const { id } = req.body;

    // Vérifier si l'ID est fourni
    if (!id) {
      return res.status(400).json({
        status: 1,
        message: "L'identifiant de l'annonce est requis.",
      });
    }

    // Utiliser `findByIdAndUpdate` pour réduire le nombre d'opérations
    const announcement = await Announcement.findById(id);

    // Vérifier si l'annonce existe
    if (!announcement) {
      return res.status(404).json({
        status: 1,
        message: "Annonce non trouvée.",
      });
    }

    const update = {};
    if (announcement.active) {
      // Si active est true, on le passe à false et on ajoute locked
      update.active = false;
      update.locked = true; 
    } else {
      // Si active est false, on le passe à true et on retire locked
      update.active = true;
      update.$unset = { locked: "" }; // Utiliser $unset pour supprimer `locked`
      
      const user = await User.findOne({_id: announcement.userId}); 
      
        const search = await Search.findOne({startCity: announcement.startCity, endCity: announcement.endCity, type: announcement.type,
          year: new Date(announcement.dateOfDeparture).getFullYear().toString(), $or: [{month: new Date(announcement.dateOfDeparture).getMonth().toString()}, {month: (new Date(announcement.dateOfDeparture).getMonth() + 1).toString()}]});

      console.log("la recherche", search);
      
      
  if(search){
    
      const userr = await User.findOne({_id: search.userId});
      const badgee = await Notification.countDocuments({read: false, receiverId: userr._id})
      
      const newNotif = Notification({
        title: "Bonne nouvelle", 
        body: "Un container correspondant à une de vos recherche a été trouvé", 
        date: new Date(), 
        read: false, 
        view: false,
        receiverId: userr._id, 
        authorId: "grouping", 
        annonceId: announcement._id
      })
      
      await newNotif.save();
    
      for(let tokennn of userr.fcmToken){
        
          await sendPushNotification(tokennn.fcmToken, "Bonne nouvelle", "Un container correspondant à une de vos recherche a été trouvé", badgee , {annonceId: announcement._id,  "status": `1`, "badge": `${badgee}`} )
      
      }
    
  }
      
      const tokens = user.fcmToken; 
      
      const newNotification = Notification({
        
          title: "Félicitations", 
          body: "L'annonce sur votre conteneur est désormais active et visible pour tous. Retrouvez là dans vos annonces", 
          date: new Date(), 
          read: false, 
          view: false, 
          authorId: "grouping", 
          receiverId: user._id
      })
      
      await newNotification.save();
      
      const badge = await Notification.countDocuments({receiverId: user._id, read: false}); 
      
      for(let token of tokens){
        
          await sendPushNotification(token.fcmToken,"Félicitations" , 
            "L'annonce sur votre conteneur est désormais active et visible pour tous. Retrouvez-la dans vos annonces", 
            badge, {"status": `0`, "badge": `${badge}`})
      }
      
    }

    // Appliquer les modifications
    const updatedAnnouncement = await Announcement.findByIdAndUpdate(
      id,
      update,
      { new: true } // Retourner l'objet mis à jour
    );

    res.status(200).json({
      status: 0,
      message: "Statut 'active' mis à jour avec succès.",
      announcement: updatedAnnouncement,
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour du statut 'active' :", error);
    res.status(500).json({
      status: 1,
      message: "Erreur lors de la mise à jour du statut 'active'.",
      error,
    });
  }
};
