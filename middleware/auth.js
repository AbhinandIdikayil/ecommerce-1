const userModel = require('../models/userModel')

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
exports.isAdminLogged = async (req,res,next) => {
    try {
        if(req.session.admin){
            res.redirect('/admin/home')
        }else{
            next()
        }
    } catch (error) {
        console.log(error)
    }
}
exports.isAdminNotLogged = async (req,res,next) => {
    try {
        if(!req.session.admin){
            res.redirect('/admin')
        }else{
            next()
        }
    } catch (error) {
        console.log(error);
    }
}