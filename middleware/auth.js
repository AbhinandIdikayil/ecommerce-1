const userModel = require('../models/userModel')
const jwt = require('jsonwebtoken');
exports.isSignInOrLogin = async (req,res,next) => {
    try {
        if(!req.session.email)
        {
            res.redirect('/signup')
        }else{
            next();
        }
    } catch (error) {
        console.log(error);
        res.status(500).send('Internal Server Error');
    }
}

exports.notSignInOrLogin = async (req,res,next) => {
    try {
        if(req.session.email)
        {
            res.redirect('/home')
        }else{
            next()
        }   
    } catch (error) {     
    }
}

exports.isBlocked = async (req,res,next) => {
    try {
        let user = await userModel.findOne({email:req.session.email}); 
        if(user && user.blocked !== null){
            if(user.blocked === true){
                res.render('user/login',{message:"you are blocked"})
            }
        }    
        next()  
    } catch (error) {
        console.log(error)
    }
}
exports.requireAuth = (req, res, next) => {
    const token = req.cookies['admin-token'];
  
    // Check if token exists
    if (token) {
      jwt.verify(token, process.env.JWT_SECRET, (err, decodedToken) => {
        if (err) {
          console.log(err.message);
          res.redirect('/admin/login'); // Redirect to login if token is invalid
        } else {
          console.log('Decoded Token:', decodedToken);
          next(); // Continue to the next middleware or route handler
        }
      });
    } else {
      res.redirect('/admin'); // Redirect to login if token is not present
    }
};

exports.requireAuth2 = (req, res, next) => {
    const token = req.cookies['admin-token'];
  
    // Check if token exists
   try {
    if (!token) {
      next();
    } else {
        jwt.verify(token, process.env.JWT_SECRET, (err, decodedToken) => {
            if (err) {
            console.log(err.message);
            next();
            } else {
            console.log('Decoded Token:', decodedToken);
            res.redirect('/admin/home?filter=Weekly'); // Redirect to login if token is invalid

            }
        });
    }
   } catch (error) {
      console.log(error)
   }
  };


// exports.isAdminNotLogged = async (req,res,next) => { 
//     const token =  req.cookies['admin-token'];
//     try {
//         if(token){
//             res.redirect('/admin')
//         }else{
//             next()
//         }
//     } catch (error) {
//         console.log(error);
//     }
// }\
exports.checkAdmin = (req, res, next) => {
  
  const token = req.cookies["admin-token"];

  if(token){
    jwt.verify(token, process.env.JWT_SECRET, async (err, decodedToken) => {
  
      if(err){
        next();
      }else{  
        next();
      }
    })

  }else{
    res.locals.admin = null;
    next();

  }
}

