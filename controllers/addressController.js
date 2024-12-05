const addressModel = require('../models/addressModel');                     
const userModel = require('../models/userModel');
const mongoose = require('mongoose')

exports.getEditAddress = async (req,res,next) => {
    try {
      let id = req.params?.id;
      let address = await addressModel.findById(id).populate('firstname');
      if(address){
        res.render('user/editAddress',{address:address})
      }
     
    } catch (error) {
      console.log(error);
        const customError = new Error('Somthing went wrong');
      customError.status = 500; // Set the desired status code
      customError.data = { additionalInfo: 'Additional information about the error' };
      next(customError);
    }
  }




  exports.postEditAddress = async (req,res,next) => {
    try {
      let id = req.params?.id;
      let {firstname,mobile,pincode,address,housename,state,districtORcity} = req.body;
      let updating = {
        firstname:firstname,
        mobile:mobile,
        pincode:pincode,
        address:address,
        housename:housename,
        districtORcity:districtORcity,
        state:state,
      }
      let updatedAddress = await addressModel.findByIdAndUpdate(
        id,
        {$set:updating},
        {new:true}
      )
      if(updatedAddress){
        res.redirect('/home/account/addresses')
      }
    } catch (error) {
      console.log(error);
      const customError = new Error('Somthing went wrong');
      customError.status = 500; // Set the desired status code
      customError.data = { additionalInfo: 'Additional information about the error' };
      next(customError);
    }
  }



  exports.delelteAddress = async (req,res,next) => {
    try {
      // for deleting the address
     let id = req.params?.id;
     let address = await addressModel.findByIdAndDelete(id);
     console.log('in server')
     if(address){
       res.json(true).status(200);
     }else{
       res.status(400).json({ error: 'Address not found' });
     }
    } catch (error) {

      console.log(error);
      const customError = new Error('Somthing went wrong');
      customError.status = 500; // Set the desired status code
      customError.data = { additionalInfo: 'Additional information about the error' };
      next(customError);
    }
 }




 exports.PostaddAddress = async (req,res,next) => {
    try {
      
      const {userId,firstname_value,mobile,pincode,housename,address,districtORcity,state} = req.body;
      console.log(req.body)
      const newAddress = new addressModel({
        user:userId,
        firstname:firstname_value,
        mobile,
        pincode,
        housename,
        address,
        districtORcity,
        state,
      })
      let save = await newAddress.save()
      if(save){
        res.redirect("/home/account/addresses")
      }
        
    } catch (error) {
      console.log(error)
      const customError = new Error('Somthing went wrong');
      customError.status = 500; // Set the desired status code
      customError.data = { additionalInfo: 'Additional information about the error' };
      next(customError);
    }
  }

  

  exports.AddressDetails = async (req,res,next) => {
    try {
      let user = await userModel.findOne({email:req.session.email});
      let userId = user._id
      console.log("user id is:"+userId)
      let address = await addressModel.find({user:new mongoose.Types.ObjectId(userId)})
      console.log("address is "+address)
      if(user && address){
        res.render('user/addAdress',{user:user,address:address})
      }
        
    } catch (error) {
      console.log(error)
          const customError = new Error('Somthing went wrong');
          customError.status = 500; // Set the desired status code
          customError.data = { additionalInfo: 'Additional information about the error' };
  
          next(customError);
    }
  }