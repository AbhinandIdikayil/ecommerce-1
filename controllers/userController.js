
const bcrypt = require('bcryptjs');
const nodemailor = require('nodemailer');
const productModel = require('../models/productModel');
const cartModel = require("../models/cart");
const categoryModel = require("../models/category");
const userModel = require('../models/userModel')
const addressModel = require("../models/addressModel");
const orderModel = require('../models/orderModel');
const walletModel = require('../models/wallet')
const bannerModel = require('../models/bannerModel')
const couponModel = require('../models/coupon');
const otpModel = require('../models/otp')
const refferalModel = require('../models/refferalModel')

const Razorpay = require('razorpay');
const crypto = require('crypto');
const mailgen = require('mailgen');
const shortid = require('shortid');

const mongoose = require('mongoose');
const offerModel = require('../models/offerModel');
let SignupWithReffer = false;


let otp;
let Globalfullname,Globalemail,Globalpassword;

let instance = new Razorpay({ 
  key_id: process.env.KEY_ID, 
  key_secret: process.env.KEY_SECRET
})

// function to generatr OTP
function generateOTP() {
    return Math.floor(1000 + Math.random() * 9000);
}
// function to sent otp to email
function sendOTP(email,OTP){
  let config = {
    service : 'gmail',
    auth:{
        user:process.env.EMAIL,
        pass : process.env.PASSWORD,
    }
  }
  
  let transporter = nodemailor.createTransport(config);

  let mailgenerator = new mailgen({
    theme:'default',
    product:{
        name:"minishop",
        link:'https://mailgen.js/'
    }
  })

  let response = {
    body:{
        name:`${email}`,
        intro:`your otp is ${OTP}`
    }
  }
  let mail = mailgenerator.generate(response);

  let message = {
    from:process.env.EMAIL,
    to:email,
    subject:"otp succesfully sented",
    html:mail
  }
  transporter.sendMail(message)
}

exports.getSignup = async(req,res,next) => {
  let refercode = req.query.refercode
  let userId = req.query.userid
  res.render('user/signup',{refercode,userId});
}

exports.postSignup = async(req,res,next) => {
    console.log('form resubmission')
    Globalfullname = req.body.fullname;
    Globalemail = req.body.email;
    Globalpassword = req.body.password;
    console.log(req.body)
    console.log(Globalfullname)
    try {

      if(Globalfullname.trim('').length <= 3){
        return res.render('user/signup',{message:'Enter a valid name'});
      }
    
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(Globalemail)){
          req.session.checkEmail = 'Please enter a valid email address.';
          return res.render('user/signup',{testEmail:req.session.checkEmail});
      }
      const existingUser = await userModel.findOne({ $and: [{ firstname:Globalfullname }, { email: { $regex: new RegExp(Globalemail, 'i') } }  ] });
      if(existingUser){
          req.session.existingUser="user with same email and username already exists";
          return res.render('user/signup',{message:req.session.existingUser})
      }

        if(req.query.refercode){
      
          let refferalcode = req.query.refercode;
          let id = req.query.userid;
          let selectedRefer = await refferalModel.findOne()
          let refferedamount = selectedRefer.refferedamount;
          let refferalamount = selectedRefer.refferalamount
          
          SignupWithReffer = true;
          // for the user who shared the refer code
          let userwallet = await walletModel.findOne({user:new mongoose.Types.ObjectId(id)})
            if(userwallet !== null){
              console.log('in if')
              let updated = await walletModel.findOneAndUpdate(
                {user:new mongoose.Types.ObjectId(id)},
                {
                  $inc:{walletbalance:refferalamount},
                  $push:{transactions:{amount:refferalamount,type:'credit(By reffering)'}}
                },
                {new:true},
              )
            }else{
              console.log('in else')
              let wallet = new walletModel({
                user:id,
                walletbalance:refferalamount,
                transactions:[{
                  amount:refferalamount,
                  type:'credit(Refferal bonus)',
                }]
              })
              let saved = await wallet.save()
            }
        }

        otp = generateOTP();
        let generadtedotp = otp
        console.log(otp)
        req.session.email = Globalemail;
        // user.otp = otp;
        // await user.save();
        sendOTP(Globalemail,otp);
        //  render the otp page
        const savedOtp = await new otpModel({
          email:req.session.email,
          otp:generadtedotp,
        })
        let saved = await savedOtp.save()
        
        res.render('otp',{message:''});
    } catch (error) {
        console.log(error)
    }
}

exports.loadLogin = async (req,res,next) => {   
  res.render('user/login');  
}

exports.postLogin = async (req,res,next) => {
  let {email,password} = req.body;
  try { 
    let user = await userModel.findOne({email});
    if(!user){
      return  res.render('user/login',{message:"No user"})
    }
    
    let matchedPassword = await bcrypt.compare(password,user.password)
    if(matchedPassword){
        console.log("succesfull");
        req.session.email = email;
        req.session.name = user.firstname;
        req.session.userId = user._id;
        res.redirect('/home');
    }else{
        res.render('user/login',{message:"incorrect password"})
    }

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}

exports.loadHome = async (req,res,next) => {
  let product = await productModel.find().populate('category');
  try {
    let userDetails = await userModel.findOne({email:req.session.email})
    let banners = await bannerModel.find();
    let coupon = await couponModel.find({isExpired:false});
    let offers = await offerModel.find().populate('categoryId');
    let reffer = await refferalModel.findOne();

  
    res.render('user/home',{product:product,user:userDetails,
      banners,
      coupon:coupon || undefined,
      reffer:reffer || undefined,
      offers:offers || undefined,
    });
      
  } catch (error) {
    const customError = new Error('Somthing went wrong');
    customError.status = 500; // Set the desired status code
    customError.data = { additionalInfo: 'Additional information about the error' };
    next(customError);
  }
}

exports.postOTP = async (req,res,next)=> {
      // const userId = req.params.id;
      // const userOTP = req.body.otp;
      const {otp} = req.body

      let parsedOTP= parseInt(otp)
      try {       
        // Check if OTP is correct
        let userOtp = await otpModel.find({email:req.session.email})
        let DBotp = userOtp.map(doc => doc.otp)
        console.log(userOtp,DBotp)
        if(userOtp.length > 0){
          if(DBotp.includes(parsedOTP)){
            let code = shortid.generate() //creating a unique ID for users refercode
            let hashed = await bcrypt.hash(Globalpassword,10);
            let user = new userModel({
              firstname:Globalfullname,
              email:Globalemail,
              password:hashed,
              refercode:code
            });
            let userData = await user.save();
            console.log(userData)
            if(userData)
            {
              // storing userId on session
              req.session.userId = userData._id;

              if(SignupWithReffer){
                let reffer = await refferalModel.findOne()
                let refferedamount = reffer.refferedamount
                let refferalamount = reffer.refferalamount
                // for the user who trying to signup with the refercode
                let newwallet = new walletModel({
                  user:userData._id,
                  walletbalance:refferedamount,
                  transactions:[
                    {
                      amount:refferedamount,
                      type:'credit(signup bonus)',
                    }
                  ] 
                })
                let save = await newwallet.save();
                SignupWithReffer = false;
              }else{
                let newWallet = new walletModel({
                  user:userData._id
                })
                await newWallet.save()
              }
              res.status(200).json({success:true})
            }

          }else{
            res.status(401).json({invalid:true})
          }
        }else{
          res.status(403).json({expired:true})
        }
        
  
      } catch (error) {
        console.error(error);
        const customError = new Error('Somthing went wrong');
        customError.status = 500; // Set the desired status code
        customError.data = { additionalInfo: 'Additional information about the error' };
        next(customError);
      }
}

exports.resendOTP = async (req,res,next) => {
  try {
    let resendedOtp = generateOTP();

    sendOTP(req.session.email,otp);
    let DBotp = new otpModel({
      email:req.session.email,
      otp:resendedOtp
    })
    let saved = await DBotp.save();
    res.render('otp',{message:''})
  } catch (error) {
    console.log(error);
    const customError = new Error('Somthing went wrong');
    customError.status = 500; // Set the desired status code
    customError.data = { additionalInfo: 'Additional information about the error' };
    next(customError);
  }
}

let forgotOtp;
let email;
exports.postForgotPassword = async (req,res,next) => {
  try {
    
    email = req.body.email
    let user = await userModel.findOne({email});

    if(user){
      let user = await userModel.findOne({email});

      if(user){
        forgotOtp = generateOTP();
        sendOTP(email,forgotOtp);
        res.status(200).json({ success: true, email: email });

      }else{
        res.render('/login',{message:'no users found'});
      }
      
    }else{
         res.status(400).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    console.log(error);
    const customError = new Error('Somthing went wrong');
    customError.status = 500; // Set the desired status code
    customError.data = { additionalInfo: 'Additional information about the error' };
    next(customError);   
  }
}
exports.postForgotPasswordOTP = async (req,res,next) => {
    try {
      let {otp} = req.body;
      let parsedOTP = parseInt(otp);
      // here forgot otp is the generated otp if the user click forgot password
      if(forgotOtp === parsedOTP){
        console.log('in server')
        res.status(200).json({succcess:true});
        console.log("after response")
      }else{
        res.status(400).json({message:'user not found'});
      }
    } catch (error) {
      console.log(error)
      const customError = new Error('Somthing went wrong');
      customError.status = 500; // Set the desired status code
      customError.data = { additionalInfo: 'Additional information about the error' };
      next(customError);
    }
}


exports.postNewPassword = async (req,res,next) => {
  try {
    let {password,confirmPassword} = req.body;
    let hashed  = await bcrypt.hash(confirmPassword,10)
    
    let updating = {
      password:hashed,
    }
    let user = await userModel.findOneAndUpdate(
      {email},
      {$set:updating},
      {new:true},
    )
    if(user){
      res.status(200).json({success:true})
    }else{
      res.status(400).json({message:"Something went wrong"});
    }
  } catch (error) {
    const customError = new Error('Somthing went wrong');
    customError.status = 500; // Set the desired status code
    customError.data = { additionalInfo: 'Additional information about the error' };
    next(customError);
  }
}

exports.Signout = async (req,res,next) => {
    req.session.destroy();
    res.redirect('/home');
}
exports.getProducts = async (req,res,next) => {
  try {
    let isCart;
    let id = req.params.id;

    let product = await productModel.findById(id);
    let userDetails = await userModel.findOne({email:req.session.email});
    
    if(userDetails !== null){
      let userId = userDetails._id;
      let carts  = await cartModel.aggregate([
        {
          $match:{
            user:userId
          }
        },
        {
          $unwind:"$items"
        }
      ])
     
      carts.forEach((carts) => {
        console.log(typeof id,typeof carts.items.product.valueOf())
        if(id === carts.items.product.valueOf()){
          isCart = true
        }
      })
      
      res.render('user/productDetails',{product,cart:isCart,user:userDetails});

    }else{
      userDetails = null;
      let carts  = null;
      let product = await productModel.findById(id);
      res.render('user/productDetails',{product,cart:carts,user:userDetails}) 
    }
  } catch (error) {
    console.log(error)
    const customError = new Error('Somthing went wrong');
    customError.status = 500; // Set the desired status code
    customError.data = { additionalInfo: 'Additional information about the error' };
    next(customError);
  }
}


exports.getWishlist = async (req,res,next) => {
  try {
      res.send('wishlist')
  } catch(error) {
    console.log(error);
    const customError = new Error('Somthing went wrong');
    customError.status = 500; // Set the desired status code
    customError.data = { additionalInfo: 'Additional information about the error' };
    next(customError);
  }
}


exports.loadCheckOut = async (req,res,next) => {
  try {
    let userDetails = await userModel.findOne({email:req.session.email});
    let userId = userDetails._id;

                                                      

    let carts = await cartModel.aggregate([
      {
        $match: { user: new mongoose.Types.ObjectId(userId) }
      },
      {
        $unwind: "$items"
      },
      {
        $lookup: {
          from: productModel.collection.name,
          localField: 'items.product',
          foreignField: '_id',
          as: 'itemDetails'
        }
      },
      {
        $unwind: "$itemDetails"
      },
      {
        $lookup: {
          from: userModel.collection.name,
          localField: 'user',
          foreignField: '_id',
          as: 'userDetails'
        }
      },
      {
        $unwind: "$userDetails"
      },
      {
        $lookup: {
          from: categoryModel.collection.name,
          localField: 'itemDetails.category',
          foreignField: '_id',
          as: 'categoryDetails',
        }
      },
      {
        $unwind:"$categoryDetails"
      }
    ]);

    let sum = await cartModel.aggregate([
      {
        $match: { user: new mongoose.Types.ObjectId(userId) }
      },
      {
        $unwind:"$items"
      },
      {
        $lookup:{
          from:productModel.collection.name,
          localField:"items.product",
          foreignField:"_id",
          as:"itemDetails",
        }
      },
      {
        $unwind:"$itemDetails"
      },
      {
        $group:{
          _id:null,
          total: {
            $sum: {
              $multiply: ["$itemDetails.price", "$items.quantity"]
            }
          }
        }
      }
    ])
    console.log(`ASFD${sum}`)
   
    
    req.session.sumOfPrice = sum[0].total;
    let user = await userModel.findById(userId);
    let address = await addressModel.find({user:userId});
    let wallet = await walletModel.findOne({user:req.session.userId});
    console.log(wallet)
    console.log('SDFSAD'+address)

    res.render('user/checkOut',{
      sum,carts,address:address,
      user,wallet,walletError:req.session.giveWalletError || ''
    })
  } catch (error) {
    console.log(error);
    const customError = new Error('Somthing went wrong');
    customError.status = 500; // Set the desired status code
    customError.data = { additionalInfo: 'Additional information about the error' };
    next(customError);
  }
}


exports.postAddressFromCheckOut = async(req,res,next) => {
  try {
    let id = req.params.id;
    const {
      firstname_value,mobile,
      pincode,housename,address,
      districtORcity,state
    } = req.body;
    // updating the selected field value in to false when user add a new address in checkout
    let restOfAddresses = await addressModel.updateMany({user:id},{selected:false},{new:true})
    
    const newAddress = new addressModel({
      user:id,
      firstname:firstname_value,
      mobile,
      pincode,
      housename,
      address,
      districtORcity,
      state,
      selected:true,
    })
    let save = await newAddress.save();
    console.log('afrer saving')
    if(save){
      res.redirect('/home/cart/check-out')
    }
  } catch (error) {
    console.log(error); 
    const customError = new Error('Somthing went wrong');
    customError.status = 500; // Set the desired status code
    customError.data = { additionalInfo: 'Additional information about the error' };
    next(customError);
  }
}

exports.modalAddressSelecting = async (req,res,next) => {
  try {

    let id = req.params.id;
    //storing address id in session
    console.log("id of address"+id)
    req.session.idOfAddress = id;

    let updateAllAddress = await addressModel.updateMany(
      {user:req.session.userId},
      {$set:{selected:false}}
    )
      
    let updateOneaddress = await addressModel.findByIdAndUpdate(
      id,
      {$set:{selected:true}},
      {new:true}
    ); 

    if(updateAllAddress && updateOneaddress){
      res.redirect('/home/cart/check-out')
    }
                                                
  } catch (error) {
    console.log(error);
    const customError = new Error('Somthing went wrong');
    customError.status = 500; // Set the desired status code
    customError.data = { additionalInfo: 'Additional information about the error' };
    next(customError);
  }
}


exports.accounDetails = async (req,res,next) => {
  try {
    let userDetails = await userModel.findOne({email:req.session.email});
    res.render('user/accountDetails',{user:userDetails});
  } catch (error) {
    console.log(error);
    const customError = new Error('Somthing went wrong');
    customError.status = 500; // Set the desired status code
    customError.data = { additionalInfo: 'Additional information about the error' };
    next(customError);
  }
}

exports.updateUserInformation = async (req,res,next) => {
  try {
    let id = req.params.id;
    const {firstname,lastname,email} = req.body;
    req.session.email = email;
    let updating = {
      firstname:firstname,
      lastname:lastname,
      email:email
    }
    let userDetails = await userModel.findByIdAndUpdate(
      id,
      {$set:updating},
      {new:true}
    )
    if(userDetails){
      res.redirect('/home/account')
    }
  } catch (error) {
    console.log(error);
    const customError = new Error('Somthing went wrong');
    customError.status = 500; // Set the desired status code
    customError.data = { additionalInfo: 'Additional information about the error' };
    next(customError);
  }
}






exports.successPage = async (req,res,next) => {
  try {
    res.render('user/successPage')
  } catch (error) {
    console.log(error)
    const customError = new Error('Somthing went wrong');
    customError.status = 500; // Set the desired status code
    customError.data = { additionalInfo: 'Additional information about the error' };
    next(customError);
  }
}

exports.onlinePayment = async(req,res,next) => {
  try {
    
    let userId = req.session.userId;
    let objectId = new mongoose.Types.ObjectId(userId)
    let carts = await cartModel.aggregate([
      {
        $match:{user:objectId}
      },
      {
        $unwind:"$items"
      },
      {
        $lookup:{
          from:productModel.collection.name,
          localField:"items.product",
          foreignField:"_id",
          as:"cart_product"
        }
      },
      {
        $unwind:'$cart_product'
      },       
    ])
  
    let productIds = carts.map((cart) => {
      let obj = {
        productId:cart.items.product,
        productPrice:cart.cart_product.price,
        offer:cart.cart_product.offer,
        quantity:cart.items.quantity,
        orderStatus:'pending',
      }
      return obj;
    })
   
  
    let stocks = carts.map((cart) =>{
      return parseInt(cart.items.quantity);
    })


    // here i store the user selected quantity in the array called stocks and update the 
    // or decrement the stock of the product by passing the array into the fiedl called stock.
    carts.forEach(async (cart,ind) => {
      let updatedProductStock = await productModel.findByIdAndUpdate(
        cart.items.product,
        {
          $inc:{stock:-stocks[ind]}
        },
        {new:true}
      )
    })
    let address = await addressModel.findById(req.session.addressId);
    let dbaddress = {
      firstname:address.firstname,
      mobile:address.mobile,
      pincode:address.pincode,
      address:address.address,
      housename:address.housename,
      districtORcity:address.districtORcity,
      state:address.state,
    }
    let hmac = crypto.createHmac('sha256','FOX2qTI49vLJ5s7uvRjKYGKQ');

    hmac.update(req.body['payment[razorpay_order_id]'] + "|" +req.body['payment[razorpay_payment_id]']);
    hmac = hmac.digest('hex')
    console.log(hmac)
    if(hmac === req.body['payment[razorpay_signature]']){
        let price = req.session.sumOfPrice ??  req.session.priceAfterCoupon;
        let order = new orderModel({
          user:req.session.userId,
          address:dbaddress,
          orderItems:
            productIds.map((ids) => {
                return ids;
            }),
          price,
          paymentMethod:'online-payment',
        })
        await order.save();
        let emptyCart = await cartModel.updateMany( 
          {user:userId},
          {$set:{items:[]}},
          {new:true}
        )
      delete req.session.giveWalletError 
      delete req.session.couponAvailable
      res.json({status:true})
    }else{
        res.json({status:false,errMessage:''})
        console.log('sfd');
    }
  } catch (error) {
    console.log(error);
    const customError = new Error('Somthing went wrong');
    customError.status = 500; // Set the desired status code
    customError.data = { additionalInfo: 'Additional information about the error' };
    next(customError);
  }
}


exports.proceedToPayment = async (req,res,next) => {
  try {
    // id means the id of address document that user selected
    const {paymentMethod,afterOfferPrice} = req.body;
    let priceAfterOffer = parseInt(afterOfferPrice)
    let id = req.params.id;
  
    req.session.addressId = id;
    let userId = req.session.userId;
    let objectId = new mongoose.Types.ObjectId(userId)
    // let carts = await cartModel.find({user:req.session.userId});

    let carts = await cartModel.aggregate([
      {
        $match:{user:objectId}
      },
      {
        $unwind:"$items"
      },
      {
        $lookup:{
          from:productModel.collection.name,
          localField:"items.product",
          foreignField:"_id",
          as:"cart_product"
        }
      },
      {
        $unwind:'$cart_product'
      },
      {
        $lookup:{
          from:categoryModel.collection.name,
          localField:'cart_product.category',
          foreignField:'_id',
          as:'category'
        }
      },
      {
        $unwind:'$category'
      }
    ])
  
    console.log(carts)
    let productIds = carts.map((cart) => {
      let obj = {
        productId:cart.items.product,
        category:cart.category.categoryname,
        productPrice:cart.cart_product.price,
        offer:cart.cart_product.offer,
        quantity:cart.items.quantity,
        orderStatus:paymentMethod === 'cash-on-delivery'?"ordered":'pending'
      }
      return obj;
    })

    let stocks = carts.map((cart) =>{
        return parseInt(cart.items.quantity);
    })
    console.log(stocks)
    // here i store the user selected quantity in the array called stocks and update the 
    // or decrement the stock of the product by passing the array into the fiedl called stock.
    carts.forEach(async (cart,ind) => {
      let updatedProductStock = await productModel.findByIdAndUpdate(
        cart.items.product,
        {
          $inc:{stock:-stocks[ind]}
        },
        {new:true}
      )
    })

    let address = await addressModel.findById(id);
    let dbaddress = {
      firstname:address.firstname,
      mobile:address.mobile,
      pincode:address.pincode,
      address:address.address,
      housename:address.housename,
      districtORcity:address.districtORcity,
      state:address.state,
    }

    let afterApplyingCoupon=undefined;
    if(req.session.couponAvailable){
      let price = req.session.sumOfPrice
      console.log(price)
      afterApplyingCoupon = parseInt(price - req.session.couponAvailable/100 *price) ;
      
      req.session.sumOfPrice = undefined
      req.session.priceAfterCoupon = parseInt(afterApplyingCoupon)  
    }

    let price =  req.session.sumOfPrice ?? afterApplyingCoupon
  
    if(carts && address)
    {        
      if(paymentMethod === 'cash-on-delivery'){
        let order = new orderModel({
          user:req.session.userId,
          address:dbaddress,
          orderItems:
          productIds.map((ids) => {
              return ids;
          }),
          price:priceAfterOffer,
          paymentMethod,
        })
      
        let save = await order.save()
        // emptying the cart
          let emptyCart = await cartModel.updateMany( 
            {user:userId},
            {$set:{items:[]}},
            {new:true}
          )
        delete req.session.giveWalletError 
        res.redirect('/order/success-page');
        delete req.session.couponAvailable
      }else if(paymentMethod === 'wallet'){
        let wallet = await walletModel.findOne({user:req.session.userId});
        let amount = wallet.walletbalance;
        
        if(priceAfterOffer <= amount){
          let changeWalletprice = amount - priceAfterOffer;
          await walletModel.findOneAndUpdate({user:req.session.userId},{$set:{walletbalance:changeWalletprice}})
          let order = new orderModel({
            user:req.session.userId,
            address:dbaddress,
            orderItems:
            productIds.map((ids) => {
                return ids;
            }),
            price:priceAfterOffer,
            paymentMethod,
          })
          let save = await order.save()
          // emptying the cart
          let emptyCart = await cartModel.updateMany( 
            {user:userId},
            {$set:{items:[]}},
            {new:true}
          )
        }else{
          req.session.giveWalletError  ='Insufficient Wallet Balance'
          return res.redirect('/home/cart/check-out')
        }
        res.redirect('/order/success-page');
        delete req.session.couponAvailable
      }else{
        let total = parseInt(req.session.sumOfPrice);
  
        let options = {
          amount:priceAfterOffer*100,
          currency:"INR",
          receipt:'order_reciep'
        };
        instance.orders.create(options,async function(err,order){
          if(err){
            console.log(err)
          }else{
            console.log('razopay order is:',order)
            res.json({
              Onlinesuccess:true,
              order,
              address:address.firstname,
              email:req.session.email,
              contact:address.mobile,
            }).status(200);
          }
  
        })
      }     
    }else{
      res.status(400).json('not found')
    }
  } catch (error) {
    console.log(error);
    const customError = new Error('Somthing went wrong');
    customError.status = 500; // Set the desired status code
    customError.data = { additionalInfo: 'Additional information about the error' };
    next(customError);
  }
}

exports.wallet =async (req,res,next) => {
  try {
    let wallet = await walletModel.findOne({user:req.session.userId});
    console.log(wallet)
    res.render('user/wallet',{userId:req.session.userId,wallet})
  } catch (error) {
    console.log(error)
  }
}
exports.addMoneyToWallet = async (req,res,next) => {
  try {
    let userId = req.params.id;
    const {amount} = req.body;
    let price = parseInt(amount);
    let options = {
      amount:price*100,
      currency:"INR",
      receipt:'order_reciept'
    };
    instance.orders.create(options,async function(err,wallet){
      if(err){
        console.log(err)
      }else{
        console.log('razopay wallet is:',wallet);
        req.session.walletPrice = price;
    
        res.json({
          walletSuccess:true,
          wallet,
        }).status(200);
      }
    })
  } catch (error) {
    console.log(error);
    const customError = new Error('Somthing went wrong');
    customError.status = 500; // Set the desired status code
    customError.data = { additionalInfo: 'Additional information about the error' };
    next(customError);
  }
}

exports.verifyWalletPayment = async (req,res,next) => {
  try {
      console.log(req.body)
      let hmac = crypto.createHmac('sha256','FOX2qTI49vLJ5s7uvRjKYGKQ');
      hmac.update(req.body['payment[razorpay_order_id]'] + "|" +req.body['payment[razorpay_payment_id]']);
      hmac = hmac.digest('hex')

      if(hmac === req.body['payment[razorpay_signature]']
          && 
        await walletModel.findOne({user:new mongoose.Types.ObjectId(req.session.userId)}) === null
      ){
  
        let price =  req.session.walletPrice
        let wallet = await walletModel.create({
          user:req.session.userId,
          walletbalance:price,
          transactions:[
            {
              amount:price,
              type:'credit'
            }
          ]
        })
        await wallet.save();
        res.json({status:true})
      }else{
        let price = req.session.walletPrice
        let newTransaction = {
          amount:price,
          type:'credit'
        }
        let wallet = await walletModel.findOneAndUpdate(
          {user:new mongoose.Types.ObjectId(req.session.userId)},
          {
            $inc:{walletbalance:price},
            $push:{transactions:newTransaction}
          },
          {new:true}
        )
        res.json({status:true})
      }
  } catch (error) {
    console.log(error);
    const customError = new Error('Somthing went wrong');
    customError.status = 500; // Set the desired status code
    customError.data = { additionalInfo: 'Additional information about the error' };
    next(customError);
  }
}


exports.coupon = async (req,res,next) => {
  try {
    const {couponcode,price} = req.body;
    let parsed = parseInt(price)
    let coupon = await couponModel.findOne({
      couponcode,
      isExpired:false,
    });
   
    if(coupon && parsed >= coupon.minprice){
      req.session.couponAvailable = coupon.discount
      return res.json({
        success:true,
        coupon
      }).status(200)
    }else if( coupon && parsed < coupon.minprice){
      return res.json({
        minprice:true,
        message:'purchase products for 1000 or more'
      })
    }else{
      return res.json({
        failed:true,
        message:'coupon expired'
      })
    }
  } catch (error) {
    console.log(error);
    const customError = new Error('Somthing went wrong');
    customError.status = 500; // Set the desired status code
    customError.data = { additionalInfo: 'Additional information about the error' };
    next(customError);
  }
}

exports.getReffer = async (req,res,next) => {
  try {
    let user = await userModel.findOne({email:req.session.email})
    let refer = await refferalModel.findOne()
    res.render('user/refferpage',{user,refer})
  } catch (error) {
    console.log(error)
    const customError = new Error('Somthing went wrong');
    customError.status = 500; // Set the desired status code
    customError.data = { additionalInfo: 'Additional information about the error' };
    next(customError);
  }
}