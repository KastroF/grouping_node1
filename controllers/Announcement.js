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

  console.log("On body bag", req.body)
  const startAt = req.body.startAt ? parseInt(req.body.startAt) : 0;

  try {
    const { status } = req.body;
    const filter = {
      active: true,
      status: status === "c" ? "container" : "kilos",
      dateOfDeparture: { $gte: new Date() },
    };

    // 🔹 Agrégation pour annonces + utilisateurs
    const result = await Announcement.aggregate([
      { $match: filter },
      {
        $addFields: { userObjectId: { $toObjectId: "$userId" } }, // convertir String → ObjectId
      },
      {
        $lookup: {
          from: "users",
          localField: "userObjectId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" }, // pour avoir un seul objet user
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

    // 🔹 Enrichir avec les informations des villes
    const cityNames = [
      ...new Set([
        ...annonces.map((c) => c.startCity),
        ...annonces.map((c) => c.endCity),
      ]),
    ];

    const cities = await City.find({ name: { $in: cityNames } }).lean();
    const cityMap = new Map(cities.map((city) => [city.name, city]));

    annonces.forEach((annonce) => {
      annonce.startCity2 = cityMap.get(annonce.startCity) || null;
      annonce.endCity2 = cityMap.get(annonce.endCity) || null;
    });

    // 🔹 Réponse
    res.status(200).json({
      status: 0,
      annonces,
      total,
      startAt: annonces.length === 10 ? startAt + 10 : null,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ err });
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
  //console.log("On commence");

  try {
    const containers = await Announcement.find({
      userId: req.auth.userId,
      active: true,
      status: "container",
    })
      .sort({ date: -1 })
      .limit(6);
    const kilos = await Announcement.find({
      userId: req.auth.userId,
      active: true,
      status: "kilos",
    })
      .sort({ date: -1 })
      .limit(6);

    for (let container of containers) {
      container.startCity2 = await City.findOne({ name: container.startCity });
      container.endCity2 = await City.findOne({ name: container.endCity });
    }

    for (let kilo of kilos) {
      kilo.startCity2 = await City.findOne({ name: kilo.startCity });
      kilo.endCity2 = await City.findOne({ name: kilo.endCity });
    }

    res
      .status(200)
      .json({
        status: 0,
        kilos,
        containers,
        startAt: containers.length == 6 ? 6 : null,
        startBt: kilos.length == 6 ? 6 : null,
      });
  } catch (err) {
    console.log(err);
    res.status(505).json({ err });
  }
};

exports.moreAnnouncements = async (req, res) => {
  //console.log(req.body);

  try {
    const annonces = await Announcement.find({
      userId: req.auth.userId,
      active: true,
      status: req.body.status,
    })
      .sort({ date: -1 })
      .skip(req.body.skip)
      .limit(6);

    if (req.body.status === "kilos") {
      for (let kilo of annonces) {
        kilo.startCity2 = await City.findOne({ name: kilo.startCity });
        kilo.endCity2 = await City.findOne({ name: kilo.endCity });
      }
    } else {
      for (let container of annonces) {
        container.startCity2 = await City.findOne({
          name: container.startCity,
        });
        container.endCity2 = await City.findOne({ name: container.endCity });
      }
    }

    res
      .status(200)
      .json({
        status: 0,
        annonces,
        skip: annonces.length === 6 ? parseInt(req.body.skip) + 6 : null,
        z: annonces.length,
      });
  } catch (e) {
    console.log(e);
    res.status(505).son({ e });
  }
};

exports.getAnnoncess = async (req, res) => {
  try {
    const currentDate = new Date();
    const limit = req.body.three ? 3 : 60;
    //console.log("Current Date:", currentDate);

    // Récupérer les annonces de conteneurs et de kilos
    const containers = await Announcement.find({
      active: true,
      status: "container",
      dateOfDeparture: { $gte: currentDate },
    })
      .sort({ date: 1 })
      .limit(limit);

    //console.log("Containers found:", containers.length);

    const kilos = await Announcement.find({
      active: true,
      status: "kilos",
      dateOfDeparture: { $gte: currentDate },
    })
      .sort({ date: -1 })
      .limit(limit);

    // Récupérer toutes les villes nécessaires
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

    // Ajouter les informations de ville aux conteneurs et kilos
    containers.forEach((container) => {
      container.startCity2 = cityMap.get(container.startCity);
      container.endCity2 = cityMap.get(container.endCity);
    });

    kilos.forEach((kilo) => {
      kilo.startCity2 = cityMap.get(kilo.startCity);
      kilo.endCity2 = cityMap.get(kilo.endCity);
    });

    // Répondre avec les données traitées
    res.status(200).json({ status: 0, kilos, containers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAnnoncee = async (req, res) => {
  try {
    //console.log(req.body)

    console.log("On se comprend");

    const annonce = await Announcement.findOne({ _id: req.body.id, active: true });

    console.log(req.body.phoneId);
    
    if(annonce){
      
          const view = await View.findOne({
      announcementId: req.body.id,
      phoneId: req.body.phoneId,
    });

    if (!view) {
      const newView = new View({
        announcementId: req.body.id,
        phoneId: req.body.phoneId,
        date: new Date(),
      });

      await newView.save();

      Announcement.updateOne(
        { _id: req.body.id },
        { $set: { views: annonce.views ? parseInt(annonce.views) + 1 : 1 } }
      ).then(
        () => {
          console.log("Tout s'est bien passé");
        },
        (err) => {
          console.log(err);
        }
      );

      annonce.views = annonce.views ? annonce.views + 1 : 1;
      console.log("On a fait notre taff");
    }
    
    

    annonce.startCity2 = await City.findOne({ name: annonce.startCity });
    annonce.endCity2 = await City.findOne({ name: annonce.endCity });

    //console.log(annonce);

    const userObjectId = new ObjectId(annonce.userId);

    const user = await User.findOne({ _id: annonce.userId });

    const sum = await Announcement.countDocuments({
      userId: user._id,
      active: true,
    });

    res.status(200).json({ status: 0, annonce, sum, user });
      
    }else{
      
      res.status(200).json({status: 1});
    }


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
  console.log("la recherche", req.body);

  // console.log(monthNameToNumber(req.body.month))

  let month = monthNameToNumber(req.body.month);
  let year = req.body.year;

  let startDate;

  console.log("le mois", new Date().getMonth());

  if (
    year === new Date().getFullYear() &&
    month - 1 === new Date().getMonth()
  ) {
    startDate = new Date();
  } else {
    startDate = new Date(year, month - 1, 1);
  }

  const endDate = new Date(year, month, 1);

  try {
    const annoncesCount = await Announcement.countDocuments({
      startCity: req.body.start,
      endCity: req.body.end,
      dateOfDeparture: {
        $gte: startDate,
        $lt: endDate,
      },
      status: req.body.type,
      active: true,
    });

    const annonces = await Announcement.find({
      startCity: req.body.start,
      endCity: req.body.end,
      dateOfDeparture: {
        $gte: startDate,
        $lt: endDate,
      },
      status: req.body.type,
      active: true,
    })
      .sort({ date: 1 })
      .skip(req.body.startAt)
      .limit(10);

    for (let kilo of annonces) {
      kilo.startCity2 = await City.findOne({ name: kilo.startCity });
      kilo.endCity2 = await City.findOne({ name: kilo.endCity });
    }

    res
      .status(200)
      .json({
        status: 0,
        annonces,
        count: annoncesCount,
        startAt:
          annonces.length === 10 ? parseInt(req.body.startAt) + 10 : null,
      });

    //console.log(annonces);
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
  
  console.log("On respecte ca"); 
  //console.log("On commence");

  try {
    
    await Announcement.updateMany({userId: req.auth.userId, active: true}, {$set: {read: true}}); 
    await Notification.updateMany({receiverId: req.auth.userId, title: "Félicitations"}, {$set: {read: true}}); 
    
    const containers = await Announcement.find({
      userId: req.auth.userId,
      active: true,
      status: "container",
    })
      .sort({ date: -1 })
      .limit(6);
    const kilos = await Announcement.find({
      userId: req.auth.userId,
      active: true,
      status: "kilos",
    })
      .sort({ date: -1 })
      .limit(6);

    for (let container of containers) {
      container.startCity2 = await City.findOne({ name: container.startCity });
      container.endCity2 = await City.findOne({ name: container.endCity });
    }

    for (let kilo of kilos) {
      kilo.startCity2 = await City.findOne({ name: kilo.startCity });
      kilo.endCity2 = await City.findOne({ name: kilo.endCity });
    }

    res.status(200).json({
      status: 0,
      kilos,
      containers,
      startAt: containers.length == 6 ? 6 : null,
      startBt: kilos.length == 6 ? 6 : null,
    });
  } catch (err) {
    console.log(err);
    res.status(505).json({ err });
  }
};

exports.moreAnnouncements = async (req, res) => {
  //console.log(req.body);

  try {
    const annonces = await Announcement.find({
      userId: req.auth.userId,
      active: true,
      status: req.body.status,
    })
      .sort({ date: -1 })
      .skip(req.body.skip)
      .limit(6);

    if (req.body.status === "kilos") {
      for (let kilo of annonces) {
        kilo.startCity2 = await City.findOne({ name: kilo.startCity });
        kilo.endCity2 = await City.findOne({ name: kilo.endCity });
      }
    } else {
      for (let container of annonces) {
        container.startCity2 = await City.findOne({
          name: container.startCity,
        });
        container.endCity2 = await City.findOne({ name: container.endCity });
      }
    }

    res.status(200).json({
      status: 0,
      annonces,
      skip: annonces.length === 6 ? parseInt(req.body.skip) + 6 : null,
      z: annonces.length,
    });
  } catch (e) {
    console.log(e);
    res.status(505).son({ e });
  }
};exports.getAnnonces = async (req, res) => {

  console.log("On body bag", req.body); 


  try {
    const currentDate = new Date();
    const limit = req.body.three ? 3 : 60;

    // Récupérer les annonces de conteneurs et de kilos
    const containers = await Announcement.find({
      active: true,
      status: "container",
      dateOfDeparture: { $gte: currentDate },
    })
      .sort({ date: -1 })
      .limit(limit);

    const kilos = await Announcement.find({
      active: true,
      status: "kilos",
      dateOfDeparture: { $gte: currentDate },
    })
      .sort({ date: -1 })
      .limit(limit);

    // Récupérer toutes les villes nécessaires
    const cityNames = [
      ...new Set([
        ...containers.map(c => c.startCity),
        ...containers.map(c => c.endCity),
        ...kilos.map(k => k.startCity),
        ...kilos.map(k => k.endCity),
      ]),
    ];
    const cities = await City.find({ name: { $in: cityNames } }).lean();
    const cityMap = new Map(cities.map(c => [c.name, c]));

    // Ajouter les informations de ville
    containers.forEach(c => {
      c.startCity2 = cityMap.get(c.startCity) || null;
      c.endCity2 = cityMap.get(c.endCity) || null;
    });
    kilos.forEach(k => {
      k.startCity2 = cityMap.get(k.startCity) || null;
      k.endCity2 = cityMap.get(k.endCity) || null;
    });

    // Récupérer les utilisateurs en parallèle
    const allUserIds = [
      ...new Set([...containers.map(c => c.userId), ...kilos.map(k => k.userId)])
    ];
    const users = await User.find({ _id: { $in: allUserIds } }).lean();
    const userMap = new Map(users.map(u => [u._id.toString(), u]));

    containers.forEach(c => {
      c.user = userMap.get(c.userId) || null;
    });
    kilos.forEach(k => {
      k.user = userMap.get(k.userId) || null;
    });

    console.log(containers);
    // Réponse
    res.status(200).json({ status: 0, kilos, containers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};


exports.getAnnonce = async (req, res) => {
  try {
    //console.log(req.body)

    const annonce = await Announcement.findOne({ _id: req.body.id });

    annonce.startCity2 = await City.findOne({ name: annonce.startCity });
    annonce.endCity2 = await City.findOne({ name: annonce.endCity });

    //console.log(annonce);

    const userObjectId = new ObjectId(annonce.userId);

    const user = await User.findOne({ _id: annonce.userId });

    const sum = await Announcement.countDocuments({
      userId: user._id,
      active: true,
    });

    res.status(200).json({ status: 0, annonce, sum, user });
  } catch (e) {
    console.log(e);
    res.status(505).json({ e });
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
  console.log(req.body);
  
  console.log("est ce que tu t'en rend compte ?")

  // console.log(monthNameToNumber(req.body.month))

  let month = monthNameToNumber(req.body.month);
  let year = req.body.year;

  let startDate;

  console.log("le mois", new Date().getMonth());

  if (
    year === new Date().getFullYear() &&
    month - 1 === new Date().getMonth()
  ) {
    startDate = new Date();
  } else {
    startDate = new Date(year, month - 1, 1);
  }

  const endDate = new Date(year, month, 1);

  try {
    const annoncesCount = await Announcement.countDocuments({
      startCity: req.body.start,
      endCity: req.body.end,
      dateOfDeparture: {
        $gte: startDate,
        $lt: endDate,
      },
      status: req.body.type,
      active: true,
    });

    const annonces = await Announcement.find({
      startCity: req.body.start,
      endCity: req.body.end,
      dateOfDeparture: {
        $gte: startDate,
        $lt: endDate,
      },
      status: req.body.type,
      active: true,
    })
      .sort({ date: 1 })
      .skip(req.body.startAt)
      .limit(10);

    for (let kilo of annonces) {
      kilo.startCity2 = await City.findOne({ name: kilo.startCity });
      kilo.endCity2 = await City.findOne({ name: kilo.endCity });
    }
    
    if(annonces.length === 0){
      
        const newSearch = Search({
           startCity: req.body.start,
            endCity: req.body.end,
            month,
            year,
            status: req.body.type,
            userId: req.auth.userId, 
            date: new Date()
        })
        
        await newSearch.save();
    }

    res.status(200).json({
      status: 0,
      annonces,
      count: annoncesCount,
      startAt: annonces.length === 10 ? parseInt(req.body.startAt) + 10 : null,
    });

    //console.log(annonces);
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
