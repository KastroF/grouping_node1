const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");


exports.changeName = async (req, res) => {
  
    try{
      
      await User.updateOne({_id: req.auth.userId}, {$set: {name: req.body.name}}); 
      
      res.status(200).json({status: 0})
      
    }catch(err){
      
        console.log(err); 
        res.status(505).json({err})
    }
}

exports.changePhoto = async (req, res) => {
  
    try{
      
      
      
      const file = req.files[0]; 
      const photo = `${req.protocol}s://${req.get("host")}/images/${file.filename}`
      
      await User.updateOne({_id: req.auth.userId}, {$set: {photo}})
      
     res.status(200).json({status: 0, photo});
      
    }catch(err){
      
        console.log(err); 
        res.status(505).json({err})
    }
    
}


 exports.updateFcmToken = async (req, res) => {
  
  console.log("On est prêt")
   
   try{
     
      const {fcmToken, deviceId} = req.body; 
   
      const userId = req.auth.userId; 
     
       const user = await User.findOne({_id: userId}); 
     
       const tokens = user.fcmToken && user.fcmToken.length > 0 ? user.fcmToken : []; 
     
       const value = tokens.filter(item => (item.fcmToken === fcmToken && item.deviceId === deviceId)); 
     
       
     
       let newToken; 
     
     
       if(tokens.length === 0){
         
         newToken = {deviceId, fcmToken}; 
         tokens.push(newToken);
         
         
       }else{
         
           //if(value[0].fcmToken)
         
           const leToken = tokens.find(item => item.deviceId === deviceId); 
         
           if(leToken && leToken.fcmToken !== fcmToken){
             
               leToken.fcmToken = fcmToken;
           }
         
         
         }
     
       await User.updateOne({_id: userId}, {$set: {fcmToken: tokens}}); 
     
       user.fcmToken = tokens; 
     
       res.status(200).json({status: 0, message: "Mise à jour effectuée avec succès", user});
   
     
     
   }catch(err){
     
       console.log(err); 
       res.status(505).json({err})
   }
  
}
 
 
 

const genererCode = () => {
  var code = "";
  for (var i = 0; i < 4; i++) {
    code += Math.floor(Math.random() * 10); // Générer un chiffre aléatoire entre 0 et 9
  }
  return code;
};
const sendEmail = (email) => {
  const code = genererCode();

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "groupingsa@gmail.com",
      pass: "Grouping@2024",
    },
  });

  const mailOptions = {
    from: "groupingsa@gmail.com",
    to: email,
    subject: "Grouping: Validation d'adresse email",
    html: `
    
    <html>  
       <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              background-color: #f0f0f0;
              padding: 20px;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #fff;
              border-radius: 10px;
              padding: 20px;
              box-shadow: 0 0 10px rgba(0,0,0,0.1);
            }
            h1 {
              color: #333;
            }
            p {
              color: #666;
            }
          </style>
        </head>
         <body>
          <div class="container">
            <h1>Validation par code OTP</h1>
            <p>Veuillez saisir le code ci-dessous dans l'application Grouping pour valider votre adresse email :</p>
            <h2>${code}</h2>
          </div>
        </body>
    </html>
  
  `,
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);

      return false;
    } else {
      console.log("Email sent: " + info.response);
      return true;
    }
  });
};

exports.signInWithGoogle = (req, res) => {
  console.log(req.body);
  User.findOne({
    email: req.body.email,
  }).then(
    (user) => {
      if (user) {
        //delete user._id
        // Vérifier si l'utilisateur est bloqué
        if (user.locked) {
          return res.status(401).json({
            status: 0,
            message: "Utilisateur non autorisé, compte bloqué",
          });
        }

        res.status(201).json({
          status: 1,
          user: user,
          message: "Utilisateur connecté avec succès",
          token: jwt.sign(
            { userId: user._id },
            "JxqKuulLNPCNfytiyqtsygygfRJYTjgkbhilaebAqetflqRfhhouhpb"
          ),
        });
      } else {
        bcrypt.hash(req.body.password, 10).then(
          async (hash) => {
            const newUser = User({
              email: req.body.email,
              name: req.body.name,
              password: hash,
              date: new Date(),
              photo: req.body.photo,
            });

            const _id = await newUser.save().then(async (uss) => {
              return uss._id;
            });

            User.findOne({ _id }).then(
              (use) => {
                delete use._id;

                res.status(201).json({
                  status: 0,
                  user: use,
                  message: "Utilisateur ajouté avec succès",
                  token: jwt.sign(
                    { userId: _id },
                    "JxqKuulLNPCNfytiyqtsygygfRJYTjgkbhilaebAqetflqRfhhouhpb"
                  ),
                });
              },
              (err) => {
                res.status(505).json({ err });
              }
            );
          },
          (err) => {
            res.status(505).json({ err });
          }
        );
      }
    },
    (err) => {
      res.status(505).json({ err });
    }
  );
};

exports.signInWithGoogleAdmin = (req, res) => {
  console.log(req.body);

  // Recherche de l'utilisateur par email
  User.findOne({ email: req.body.email }).then(
    (user) => {
      // Si l'utilisateur existe
      if (user) {
        console.log(user);
        // Vérification du rôle dans l'objet utilisateur
        const allowedRoles = ["superUser", "admin1", "admin2"];
        console.log("Role utilisateur :", user.role);
        console.log("Rôles autorisés :", allowedRoles);

        if (
          req.body.typeconnexion === "admin" &&
          (!user.role || !allowedRoles.includes(user.role))
        ) {
          return res.status(401).json({
            status: 0,
            message: "Accès non autorisé pour ce rôle.",
          });
        }
        
        // Vérifier si l'utilisateur est bloqué
        if (user.locked) {
          return res.status(401).json({
            status: 0,
            message: "Utilisateur non autorisé, compte bloqué",
          });
        }

        // Si le rôle est valide ou si typeconnexion n'est pas "admin"
        res.status(201).json({
          status: 1,
          user: user,
          message: "Utilisateur connecté avec succès",
          token: jwt.sign(
            { userId: user._id },
            "JxqKuulLNPCNfytiyqtsygygfRJYTjgkbhilaebAqetflqRfhhouhpb"
          ),
        });
      } else {
        // Si typeconnexion est "admin" et l'utilisateur n'existe pas
        if (req.body.typeconnexion === "admin") {
          return res.status(401).json({
            status: 0,
            message: "Utilisateur non autorisé.",
          });
        }

        // Création d'un nouvel utilisateur si typeconnexion n'est pas "admin"
        bcrypt.hash(req.body.password, 10).then(
          async (hash) => {
            const newUser = new User({
              email: req.body.email,
              name: req.body.name,
              password: hash,
              date: new Date(),
              photo: req.body.photo,
            });

            const _id = await newUser.save().then(async (uss) => {
              return uss._id;
            });

            User.findOne({ _id }).then(
              (use) => {
                delete use._id;

                res.status(201).json({
                  status: 0,
                  user: use,
                  message: "Utilisateur ajouté avec succès",
                  token: jwt.sign(
                    { userId: _id },
                    "JxqKuulLNPCNfytiyqtsygygfRJYTjgkbhilaebAqetflqRfhhouhpb"
                  ),
                });
              },
              (err) => {
                res.status(505).json({ err });
              }
            );
          },
          (err) => {
            res.status(505).json({ err });
          }
        );
      }
    },
    (err) => {
      res.status(505).json({ err });
    }
  );
};

exports.signUpp = (req, res) => {
  User.findOne({ email: req.body.email }).then((user) => {
    if (user) {
      res.status(201).json({ status: 1, message: "Adresse déjà utilisée" });
    } else {
      bcrypt.hash(req.body.password, 10).then(
        async (hash) => {
          const newUser = User({
            email: req.body.email,
            name: req.body.name,
            password: hash,
            date: new Date(),
          });

          const _id = await newUser.save().then(async (uss) => {
            return uss._id;
          });

          User.findOne({ _id }).then(
            (use) => {
              delete use.password;

              res.status(201).json({
                status: 0,
                user: use,
                message: "Utilisateur ajouté avec succès",
                token: jwt.sign(
                  { userId: _id },
                  "JxqKuulLNPCNfytiyqtsygygfRJYTjgkbhilaebAqetflqRfhhouhpb"
                ),
              });
            },
            (err) => {
              res.status(505).json({ err });
            }
          );
        },
        (err) => {
          res.status(505).json({ err });
        }
      );
    }
  });
};

exports.Register = (req, res) => {
  console.log(req.body);
  const code = genererCode();

  User.findOne({ email: req.body.email }).then(
    (user) => {
      if (user) {
        res.status(201).json({ status: 1, message: "Adresse déjà utilisée" });
      } else {
        res.status(201).json({
          status: 0,
          message: "Email clean",
          code,
        });
      }
    },
    (err) => {
      console.log(err);
      res.status(500).json({ err });
    }
  );
};

exports.signUp = (req, res) => {
  User.findOne({ phone: req.body.email }).then(
    (user) => {
      if (user) {
        res.status(201).json({ status: 1, message: "Adresse déjà utilisée" });
      } else {
        bcrypt.hash(req.body.password, 10).then(
          async (hash) => {
            const newUser = User({
              email: req.body.email,
              name: req.body.name,
              password: hash,
              date: new Date(),
            });

            const _id = await newUser.save().then(async (uss) => {
              return uss._id;
            });

            res.status(201).json({
              status: 0,
              message: "Utilisateur ajouté avec succès",
              token: jwt.sign(
                { userId: _id },
                "JxqKuulLNPCNfytiyqtsygygfRJYTjgkbhilaebAqetflqRfhhouhpb"
              ),
            });
          },
          (err) => {
            res.status(505).json({ err });
          }
        );
      }
    },
    (err) => {
      res.status(505).json({ err });
    }
  );
};

exports.changePassword = (req, res) => {
  
                console.log("Le new pass", req.body.newPass);
              console.log("last", req.body.last);
  
  User.findOne({ _id: req.auth.userId }).then(
    (user) => {
      if (!user) {
        res.status(200).json({
          status: 1,
          message: "Utilisateur non trouvé",
        });
      }
      else {
        
        // Vérifier si l'utilisateur est bloqué
        if (user.locked) {
          return res.status(200).json({
            status: 1,
            message: "Utilisateur non autorisé, compte bloqué",
          });
        }
        bcrypt.compare(req.body.last, user.password).then(
          async (valid) => {
            if (!valid) {
              res.status(200).json({
                status: 1,
                message: "Ancien mot de passe incorrect",
              });
            } else {
 

              
            const hash =   await  bcrypt.hash(req.body.newPass, 10); 
              
              await User.updateOne({_id: user._id}, {$set: {password: hash}})

              res.status(200).json({
                status: 0,
              });
            }
          },
          (err) => {
            console.log(err);
            res.status(505).json({ err });
          }
        );
      }
    },
    (err) => {
      console.log(err);
      res.status(505).json({ err });
    }
  );
};

exports.signIn = (req, res) => {
  User.findOne({ email: req.body.email }).then(
    (user) => {
      if (!user) {
        res.status(200).json({
          status: 1,
          message: "Utilisateur et/ou mot de passe incorrect",
        });
      }
      else {
        
        // Vérifier si l'utilisateur est bloqué
        if (user.locked) {
          return res.status(200).json({
            status: 1,
            message: "Utilisateur non autorisé, compte bloqué",
          });
        }
        bcrypt.compare(req.body.password, user.password).then(
          (valid) => {
            if (!valid) {
              res.status(200).json({
                status: 1,
                message: "Utilisateur et/ou mot de passe incorrect",
              });
            } else {
              const _id = user._id;

              delete user._id;

              res.status(200).json({
                status: 0,
                user,
                token: jwt.sign(
                  { userId: _id },
                  "JxqKuulLNPCNfytiyqtsygygfRJYTjgkbhilaebAqetflqRfhhouhpb"
                ),
              });
            }
          },
          (err) => {
            console.log(err);
            res.status(505).json({ err });
          }
        );
      }
    },
    (err) => {
      console.log(err);
      res.status(505).json({ err });
    }
  );
};

exports.signInAdmin = (req, res) => {
  // Vérification du type de connexion
  if (req.body.typeconnexion && req.body.typeconnexion === "admin") {
    User.findOne({ email: req.body.email }).then(
      (user) => {
        // Si l'utilisateur n'existe pas
        if (!user) {
          return res.status(401).json({
            status: 1,
            message: "Utilisateur non trouvé ou non autorisé.",
          });
        }
        if(user.locked){
          return res.status(401).json({
            status: 1,
            message: "Utilisateur bloqué.",
          });
          
        }

        // Vérification du rôle de l'utilisateur
        const allowedRoles = ["superUser", "admin1", "admin2"];
        if (!user.role || !allowedRoles.includes(user.role)) {
          return res.status(403).json({
            status: 1,
            message: "Accès non autorisé pour ce rôle.",
          });
        }

        // Vérification du mot de passe
        bcrypt.compare(req.body.password, user.password).then(
          (valid) => {
            if (!valid) {
              return res.status(401).json({
                status: 1,
                message: "Utilisateur et/ou mot de passe incorrect",
              });
            }

            // Suppression de l'ID de l'utilisateur dans la réponse
            const _id = user._id;
            delete user._id;

            // Réponse avec l'utilisateur et le token
            return res.status(200).json({
              status: 0,
              user,
              token: jwt.sign(
                { userId: _id },
                "JxqKuulLNPCNfytiyqtsygygfRJYTjgkbhilaebAqetflqRfhhouhpb"
              ),
            });
          },
          (err) => {
            console.error(err);
            return res.status(500).json({ err });
          }
        );
      },
      (err) => {
        console.error(err);
        return res.status(500).json({ err });
      }
    );
  } else {
    return res.status(400).json({
      status: 1,
      message: "Type de connexion invalide ou non défini.",
    });
  }
};

exports.getAllUsers = (req, res) => {
  console.log(req.body);
  if (!req.body || !["superUser", "admin1", "admin2"].includes(req.body.role)) {
    return res.status(403).json({
      status: 1,
      message: "Accès non autorisé",
    });
  }

  User.find()
    .lean() // Convertir les documents Mongoose en objets JavaScript simples
    .then((users) => {
      // Supprimer le champ password pour chaque utilisateur
      const sanitizedUsers = users.map((user) => {
        delete user.password; // Supprime la clé 'password'
        return user;
      });

      res.status(200).json({
        status: 0,
        users: sanitizedUsers,
        message: "Liste des utilisateurs récupérée avec succès",
      });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({
        status: 1,
        message: "Erreur lors de la récupération des utilisateurs",
        error: err,
      });
    });
};

exports.appleInfo = (req, res) => {
  console.log(req.body);
  res.status(201).json({ status: 0, message: "Thank You!" });
};

exports.toggleLockStatus = async (req, res) => {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ message: "ID utilisateur manquant." });
  }

  try {
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable." });
    }

    // Vérification et mise à jour de la propriété 'locked'
    if (typeof user.locked === "undefined") {
      user.locked = true; // Ajout de la propriété si elle n'existe pas
    } else {
      user.locked = !user.locked; // Inversion de la valeur actuelle
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { locked: user.locked },
      { new: true } // Retourne l'utilisateur mis à jour
    );

    res.status(200).json({
      message: `Le statut 'locked' a été ${
        user.locked ? "activé" : "désactivé"
      }.`,
      user: updatedUser,
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour du statut 'locked' :", error);
    res.status(500).json({ message: "Erreur interne du serveur." });
  }
};

exports.connectWithApple = async (req, res) => {
  try {
    if (req.body.email) {
      const user = await User.findOne({ email: req.body.email });

      if (user) {
        if (!user.appleId) {
          await User.updateOne(
            { _id: user._id },
            { $set: { appleId: req.body.appleId } }
          );
        }

        res.status(200).json({
          status: 0,
          user,
          token: jwt.sign(
            { userId: user._id },
            "JxqKuulLNPCNfytiyqtsygygfRJYTjgkbhilaebAqetflqRfhhouhpb"
          ),
        });
      } else {
        const newUser = User({
          email: req.body.email,
          name: req.body.name,
          appleId: req.body.appleId,
          date: new Date(),
        });

        const _id = await newUser.save().then(async (uss) => {
          return uss._id;
        });

        res.status(201).json({
          status: 0,
          message: "Utilisateur ajouté avec succès",
          token: jwt.sign(
            { userId: _id },
            "JxqKuulLNPCNfytiyqtsygygfRJYTjgkbhilaebAqetflqRfhhouhpb"
          ),
        });
      }
    } else {
      const user = await User.findOne({ appleId: req.body.appleId });

      if (user) {
        res.status(200).json({
          status: 0,
          user,
          token: jwt.sign(
            { userId: user._id },
            "JxqKuulLNPCNfytiyqtsygygfRJYTjgkbhilaebAqetflqRfhhouhpb"
          ),
        });
      } else {
        res
          .status(200)
          .json({ status: 2, message: "Email ou mot de passe incorrect" });
      }
    }
  } catch (e) {
    console.log(e);
    res.status(505).json({ err: e });
  }
};

exports.addUser = async (req, res) => {
  try {
    let draft = [];

    // Traitement des fichiers s'ils existent
    if (req.files && Array.isArray(req.files)) {
      for (let file of req.files) {
        draft.push(
          `${req.protocol}://${req.get("host")}/images/${file.filename}`
        );
      }
    }

    const userId = req.auth.userId; // ID de l'utilisateur qui ajoute
    const { email, name, password, role } = req.body;

    // Vérifier les droits
    const adminUser = await User.findById(userId);
    if (
      !adminUser ||
      !["superUser", "admin1", "admin2"].includes(adminUser.role)
    ) {
      return res.status(403).json({
        status: 1,
        message: "Accès non autorisé.",
      });
    }

    // Vérifier si l'email est déjà utilisé
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        status: 1,
        message: "Cet email est déjà utilisé.",
      });
    }

      // Hash du mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Créer un nouvel utilisateur
    const newUser = new User({
      email,
      name,
      password: hashedPassword,
      role: role || null,
      photo: draft[0] || null, // Utilise la première photo si présente, sinon null
      date: new Date(),
      addUserId: userId, // ID de l'utilisateur qui a ajouté
    });

    // Sauvegarde dans la base de données
    const savedUser = await newUser.save();

    res.status(201).json({
      status: 0,
      message: "Utilisateur ajouté avec succès.",
      user: savedUser,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: 1,
      message: "Erreur serveur.",
      error: err.message,
    });
  }
};