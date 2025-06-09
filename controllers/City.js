const City = require("../models/City"); 
const Country = require("../models/Country")

exports.addCity = (req, res) => {
  
    console.log(req.body);
  
    City.findOne({$or: [{code: req.body.code}, {name: req.body.name}]}).then((ville) => {
      
      if(ville){
        
        res.status(200).json({status: 1, ville});
          
      }else{
        
        
          if(req.body.country_id === "autres"){
            
            const country = new Country({
                name: req.body.country
            }); 
            
            country.save().then((pays) => {
              
                const {_id} = pays; 
                
                const city = new City({
                  name: req.body.name, 
                  country: req.body.country, 
                  code: req.body.code, 
                  country_id: _id

                  })

                city.save().then(() => {

                    res.status(201).json({status: 0});

                }, (err) => {

                    res.status(505).json({err})
                })
            })
            
          }else{
            
            
          const city = new City({
          name: req.body.name, 
          country: req.body.country, 
          code: req.body.code, 
          country_id: req.body.country_id
            
          })

        city.save().then(() => {

            res.status(201).json({status: 0});

        }, (err) => {

            res.status(505).json({err})
        })
            
          }
        

      }
      
    }, (err) => {
      
        console.log(err); 
        res.status(505).json({err})
    })
  

}


exports.getCities = (req, res) => {
  
    
    City.find().then((cities) => {
      
      res.status(200).json({status: 0, cities, });
      
        
    }, (err) => {
      
        res.status(505).json({err})
    })
}

exports.getCitiesByCountryId = (req, res) => {
  
    console.log(req.body)
  const value = req.body.active === "kilos" ? "k" : "c"; 
    
  
    City.find({country_id: req.body._id, status: {$in: [value]}}).then((cities) => {
      
      //console.log(cities);
      
       res.status(200).json({status: 0, cities});
        
    }, (err) => {
      
      console.log(err)
      
        res.status(505).json({err})
    })
}