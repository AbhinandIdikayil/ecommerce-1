
const bcrypt = require('bcrypt');
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
const { parse } = require('path');
const { query } = require('express');


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
    res.render('user/signup');
}

exports.postSignup = async(req,res,next) => {
    console.log('form resubmission')
    Globalfullname = req.body.fullname;
    Globalemail = req.body.email;
    Globalpassword = req.body.password;

    try { 
        if(req.query.ref){
          let refferalcode = req.query.refercode;
          let id = req.params.userid;
          let selectedRefer = await refferalModel.findOne()
          let referedamount = selectedRefer.refferedamount;
          let refferalamount = selectedRefer.refferalamount
          let userwallet = await walletModel.findOne({user:new mongoose.type.ObjectId(id)})
          if(userwallet){
            let updated = await walletModel.findOneAndUpdate(
              {user:new mongoose.Types.ObjectId(id)},
              {
                $inc:{walletbalance:refferalModel},
                $push:{transactions:{amount:refferalamount,type:'credit'}}
              },
              {new:true},
            )
          }else{
            let wallet = new walletModel({
              user:id,
              walletbalance:refferalamount,
              transactions:[{
                amount:refferalamount,
                type:'credit',
              }]
            })
          }
        }
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(Globalemail)) {
              req.session.checkEmail = 'Please enter a valid email address.';
              return res.render('user/signup',{testEmail:req.session.checkEmail});
          }
            const existingUser = await userModel.findOne({ $and: [{ firstname:Globalfullname }, { email: { $regex: new RegExp(Globalemail, 'i') } }  ] });
            if(existingUser){
                req.session.existingUser="user with same email and username already exists";
                return res.render('user/signup',{message:req.session.existingUser})
            }
            otp = await generateOTP();
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
      console.log(userDetails)
      let banners = await bannerModel.find()
      console.log(userDetails)
        console.log("In home");
        res.render('user/home',{product:product,user:userDetails,banners});
        
    } catch (error) {
      const customError = new Error('Somthing went wrong');
      customError.status = 500; // Set the desired status code
      customError.data = { additionalInfo: 'Additional information about the error' };
      next(error);
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
            let user = new userModel({firstname:Globalfullname,email:Globalemail,password:hashed,refercode:code});
            let userData = await user.save();
            if(userData)
            {
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
        res.status(500).json({ message: 'Internal Server Error' });
      }
}

exports.resendOTP = async (req,res) => {
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
      next(error);
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
        next(error);
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

exports.getSectionBasedProductList = async (req,res,next) => {
    try {
      let userDetails = await userModel.findOne({email:req.session.email})
      let category = await categoryModel.find({delete:false});

      let menOrWomen = req.params.section
      // You can adjust the page size as needed(here page size means the number of products cart)
      const pageSize = 6;
      let querySearch = req.query.page || 1
      const pageNumber = parseInt(querySearch) || 1; // The page number you want to retrieve
      let searchQuery = req.query.search || ''
      let categoryQuery = undefined
      if(req.query.categoryId){
        categoryQuery = req.query.categoryId
      }
      
      let minPriceQuery,maxPriceQuery;
      if(req.query.min && req.query.max){
       minPriceQuery = parseInt(req.query.min)
       maxPriceQuery =  parseInt(req.query.max)
      }else{
        minPriceQuery = 0
        maxPriceQuery = Number.MAX_SAFE_INTEGER;
      }

      const aggregateQuery = [
        {
          $match: {
            price: { $gte: minPriceQuery, $lte: maxPriceQuery },
            $and:[
              {section: { $regex: new RegExp('^' + menOrWomen, 'i') }, },
              {delete:false},
              { category:categoryQuery ?? {$exists:true},}
            ],
            $or:[
              {productname:{ $regex: new RegExp(searchQuery, 'i')}},
            ]
          },
        },
        {
        $facet: {
          data: [
            { $skip: (pageNumber - 1) * pageSize },
            { $limit: pageSize },
            { $lookup: { from: categoryModel.collection.name, localField: 'category', foreignField: '_id', as: 'categoryDetails' } },
            { $unwind: '$categoryDetails' },
            { $project: { categoryDetails: 1, productname: 1,price:1,offer:1,images:1 /* Add other fields you need */ } },
          ],
          count: [
            { $count: 'total' },
          ],
        },
        },
      ];

    // if(categoryQuery){
    //   aggregateQuery.unshift(queryCategory)
    // }
    
    const results = await productModel.aggregate(aggregateQuery).exec();
    console.log(results[0].count[0])
    const paginatedData = results[0].data;
    const totalCount = results[0].count.length > 0 ? results[0].count[0].total : 0;
    const pages =totalCount/pageSize
    console.log(pages)
    console.log('Paginated Data:', );
    console.log('Total Count:', );
   

    res.render('user/menHome.ejs',{
      Products:paginatedData,
      user:userDetails,
      category:category,
      pages,
      menOrWomen
    });
    } catch (error) {
      console.log(error)
       next(error)
    }
    
}


exports.getWishlist = async (req,res,next) => {
  try {
      res.send('wishlist')
  } catch(error) {
      console.log(error);
  }
}





exports.loadCheckOut = async (req,res,next) => {
  try {
    let userDetails = await userModel.findOne({email:req.session.email});
    let userId = userDetails._id;

                                                        // storing userId on session
                                                        req.session.userId = userId;

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
    console.log('SDFSAD'+address)

      res.render('user/checkOut',{sum,carts,address:address,user})
  } catch (error) {
    console.log(error);
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
    console.log(req.body)
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
  }
}


exports.accounDetails = async (req,res,next) => {
  try {
    let userDetails = await userModel.findOne({email:req.session.email});
    res.render('user/accountDetails',{user:userDetails});
  } catch (error) {
    console.log(error);
    next(error)
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
      next(error)
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
    next(error);
  }
}

exports.delelteAddress = async (req,res,next) => {
   try {
    let id = req.params.id;
    let address = await addressModel.findByIdAndDelete(id);
    console.log('in server')
    if(address){
      res.json(true).status(200);
    }else{
      res.status(400).json({ error: 'Address not found' });
    }
   } catch (error) {
      console.log(error);
      next(error)
   }
}

exports.getEditAddress = async (req,res,next) => {
  try {
    let id = req.params.id;
    let address = await addressModel.findById(id).populate('firstname');
    if(address){
      res.render('user/editAddress',{address:address})
    }
   
  } catch (error) {
    console.log(error);
    res.status(500).json({error:'internal sever error'})
  }
}
exports.postEditAddress = async (req,res,next) => {
  try {
    let id = req.params.id;
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
    res.status(500).json({error:'internl server error'})
  }
}

exports.getOrders = async (req,res,next) => {
  try {
    let user = await userModel.findOne({email:req.session.email});
    let userId = user._id
    // res.session.userId = userId
    // let address = await addressModel.find({user:new mongoose.Types.ObjectId(userId)})
    // let orders = await orderModel.find({user:userId});
    let orders = await orderModel.aggregate([
      {
        $match:{user:userId}
      },
      {
        $unwind:'$orderItems'
      },
      {
        $lookup:{
          from:productModel.collection.name,
          localField:'orderItems.productId',
          foreignField:'_id',
          as:'productDetails'
        }
      },
      {
        $unwind:'$productDetails'
      },
      {
        $project:{orderItems:1,orderStatus:1,paymentMethod:1,productDetails:1,orderDate:1,price:1,address:1}
      }
    ])
    console.log(orders);
    res.render('user/orders',{user:user,order:orders});
  } catch (error) {
    console.log(error)
  }
}

exports.downloadInvoice = async (req,res) => {
  try {
    const {} = req.body;
    let id = req.params.addressId
    let order = await orderModel.aggregate([
      {
        $unwind:'$orderItems'
      },
      {
        $match:{user:new mongoose.Types.ObjectId(req.session.userId),
          address:new mongoose.Types.ObjectId(id),
          'orderItems.orderStatus':{
            $ne:'cancelled'
          }
        }
      },
      {
        $lookup:{
          from:addressModel.collection.name,
          localField:'address',
          foreignField:'_id',
          as:'addressDetails'
        }
      },
      {
        $unwind:'$addressDetails'
      },
      {
        $lookup:{
          from:productModel.collection.name,
          localField:'orderItems.productId',
          foreignField:'_id',
          as:'productDetails'
        }
      },
      {
        $unwind:'$productDetails'
      },
      {
        $project:{orderItems:1,paymentMethod:1,addressDetails:1,productDetails:1,orderDate:1,price:1}
      }
    ])
    console.log('hai from invoice')
    console.log(order)
    res.json({success:true,order})
    console.log(order)
  } catch (error) {
      console.log(error)
  }
}

exports.cancelOrder = async (req,res,next) => {
  try {
    let id = req.params.id;
    const {quantity} = req.body;
    let stock = parseInt(quantity)
    let user = await userModel.findOne({email:req.session.email});
    let userId = user._id
    let productId = new mongoose.Types.ObjectId(id);
    let orderId = new mongoose.Types.ObjectId(req.params.orderId)
    console.log(userId)
    console.log(productId)
    let cancelledOrderData = await orderModel.aggregate([
      {
        $match: { user: userId,_id:orderId}
      },
      {
        $unwind: '$orderItems'
      },
      {
        $match: { 'orderItems.productId': productId }
      }
    ]);
    
    // Step 2: Perform a separate update operation
    if (cancelledOrderData.length > 0) {
      let updatePromises = cancelledOrderData.map(async (doc) => {
        await orderModel.updateOne(
          {
            _id: doc._id,
            'orderItems.productId': productId
          },
          {
            $set: { 'orderItems.$.orderStatus': 'cancelled' }
          }
        );
      });
    
      let saved = await Promise.all(updatePromises);

      // we have to increase the stock of the product when user cancel the product
      let product = await productModel.findByIdAndUpdate(
        productId,
        {
          $inc:{stock:stock}
        }
      )
      if(saved && product){
        res.redirect('/home/account/orders');
      }
    }    
    console.log(cancelledOrderData)

  } catch (error) {
    console.log(error);
  }
}


exports.successPage = async (req,res) => {
  try {
    res.render('user/successPage')
  } catch (error) {
    next(error) 
  }
}

exports.onlinePayment = async(req,res) => {
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

    let hmac = crypto.createHmac('sha256','FOX2qTI49vLJ5s7uvRjKYGKQ');

    hmac.update(req.body['payment[razorpay_order_id]'] + "|" +req.body['payment[razorpay_payment_id]']);
    hmac = hmac.digest('hex')
    console.log(hmac)
    if(hmac === req.body['payment[razorpay_signature]']){
        let price = req.session.sumOfPrice ??  req.session.priceAfterCoupon;
        let order = new orderModel({
          user:req.session.userId,
          address:req.session.addressId,
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

      res.json({status:true})
    }else{
        res.json({status:false,errMessage:''})
        console.log('sfd');
    }
  } catch (error) {
    console.log(error);
  }
}


exports. proceedToPayment = async (req,res,next) => {
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
      ])
      console.log('from carts')
      console.log(carts)

      let productIds = carts.map((cart) => {
        let obj = {
          productId:cart.items.product,
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
            address:id,
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
          res.redirect('/order/success-page');
          delete req.session.couponAvailable
        }else{
          let total = parseInt(req.session.sumOfPrice);
    
          let options = {
            amount:price*100,
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
  }
}

exports.wallet =async (req,res) => {
  try {
    let wallet = await walletModel.findOne({user:req.session.userId});
    console.log(wallet)
    res.render('user/wallet',{userId:req.session.userId,wallet})
  } catch (error) {
    console.log(error)
  }
}
exports.addMoneyToWallet = async (req,res) => {
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
    console.log(error)
  }
}

exports.verifyWalletPayment = async (req,res) => {
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
    console.log(error) 
  }
}


exports.coupon = async (req,res) => {
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
  }
}




//Use the code below to read your local file as a base64 string
exports.getOrderSummary = async (req,res) => {
  try {
    let id = req.params.id;
    let orderId = req.query.order
  
    let userDetails = await userModel.findOne({email:req.session.email});
    let product = await productModel.findById(id);
    let order = await orderModel.aggregate([
      {
        $match:{_id:new mongoose.Types.ObjectId(orderId)}
      },
      {
        $unwind:"$orderItems"
      },
      {
        $lookup:{
          from:addressModel.collection.name,
          localField:'address',
          foreignField:'_id',
          as:'addressDetails'
        }
      },
      {
        $unwind:'$addressDetails'
      }
    ])
    console.log(order)
    res.render('user/orderDetails',{user:userDetails,product,order});
  } catch (error) {
    console.log(error)
  }
}

exports.filteredCategoryPage = async (req,res) => {
  try {
    let section = req.params.section;
    let id = req.params.categoryId
    let searchQuery = req.query.search;
    const pageSize = 6;
    let querySearch = req.query.page || 1
    const pageNumber = parseInt(querySearch) || 1; 

    let minPriceQuery,maxPriceQuery;
    if(req.query.min && req.query.max){
     minPriceQuery = parseInt(req.query.min)
     maxPriceQuery =  parseInt(req.query.max)
    }else{
      minPriceQuery = 0
      maxPriceQuery = Number.MAX_SAFE_INTEGER;
    }

    let category = await categoryModel.find({delete:false})
    let userDetails = await userModel.findOne({email:req.session.email});
    let Products = await productModel.aggregate([
      {
        $match:{  
          section:{$regex:new RegExp('^' + section, 'i') },
          category:new mongoose.Types.ObjectId(id),
          price:{$gte:minPriceQuery,$lte:maxPriceQuery},
          $or:[
            {productname:{ $regex:  new RegExp(searchQuery , 'i') }  },
          ]
        },
        
      },
      {
        $facet: {
          data: [
            { $skip: (pageNumber - 1) * pageSize },
            { $limit: pageSize },
            { $project: { categoryDetails: 1, productname: 1,price:1,offer:1,images:1 /* Add other fields you need */ } },
          ],
          count: [
            { $count: 'total' },
          ],
        },
      },
    ])

    const paginatedData = Products[0].data;
    const totalCount = Products[0].count.length > 0 ? Products[0].count[0].total : 0;
    const pages =totalCount/pageSize

    res.render('user/filterCategoryPage',{user:userDetails,
      Products:Products[0].data, 
      category,
      menOrWomen:section,
      pages,
      id
    })
  } catch (error) {
    console.log(error);
  }
}

const puppeteer = require('puppeteer')
const fsExtra = require('fs-extra')
const fs = require('fs')
const path = require('path')
const ejs = require('ejs');

exports.puppeteerInvoice = async (req,res) => {
  try {
    let orderId = req.params.orderId
    let productId = req.params.productId
    
    let order = await orderModel.aggregate([
      {
        $match:{
          _id : new mongoose.Types.ObjectId(orderId),
        },
      },
      {
        $lookup:{
          from:addressModel.collection.name,
          localField:'address',
          foreignField:'_id',
          as:"userDetails",
        }
      },
      {
        $unwind:'$userDetails'
      },
      {
        $unwind:'$orderItems'
      },
      {
        $match:{
          'orderItems.productId':new mongoose.Types.ObjectId(productId)
        }
      },
      {
        $lookup:{
          from:productModel.collection.name,
          localField:'orderItems.productId',
          foreignField:'_id',
          as:'productDetails'
        }
      },
      {
        $unwind:'$productDetails'
      }
    ])
    console.log('from order')
    console.log(order)
    // return;
    // const userData = await User.findById(userId);
    // const orderData = await Order.findById(orderId).populate(
    //   "items.product_id"
    // );


    const date = new Date();
    const data = {
      order: order[0],
      // user: userData,
      date,
    };

    // Render the EJS template
    // path.
    const ejsTemplate = path.join(__dirname, "../views/user/invoice.ejs");
    const ejsData = await ejs.renderFile(ejsTemplate,data);

    // Launch Puppeteer and generate PDF
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.setContent(ejsData, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });

    // Close the browser
    await browser.close();

    // Set headers for inline display in the browser
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline; filename=order_invoice.pdf");
    res.send(pdfBuffer);
      
  } catch (error) {
    console.log(error);
  }
}

exports.getReffer = async (req,res) => {
  try {
    let user = await userModel.findOne({email:req.session.email})
    let refer = await refferalModel.findOne()
    res.render('user/refferpage',{user,refer})
  } catch (error) {
    console.log(error)
  }
}