const userModel = require('../models/userModel')
const cartModel = require('../models/cart')
const categoryModel = require('../models/category');
const productModel = require('../models/productModel')
const mongoose = require('mongoose')

exports.addToBag = async (req,res,next) => {
    try {
        let productIds = req?.params?.id;
        let user = await userModel.findOne({email:req?.session?.email})
        
        console.log("userl:"+user)
        let idOfUser = user?._id
        let product = await productModel.findById(productIds).populate('category');
        if(product && user){
          const cart = new cartModel({
            user:idOfUser.valueOf(),
            items:[
              {
                product:product._id
              }
            ]
         })
  
         let saved = await cart.save();
          if(saved){
            res.redirect(`/home/${product?._id}`)
          }
      }
      
        // 657fc5f4069bfe1e4cdea73a
    } catch (error) {
      console.log(error)
      const customError = new Error('Somthing went wrong');
      customError.status = 500; // Set the desired status code
      customError.data = { additionalInfo: 'Additional information about the error' };
      next(customError);
    }
  }


exports.getBag = async (req,res,next) => {
    try {
      let userDetails = await userModel.findOne({email:req?.session?.email});
      let userId = userDetails?._id;
      
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
          $match:{'itemDetails.delete':false}
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
     
    //  finding the sum of  price of product in the cart page
    const cartTotal = await cartModel.aggregate([
      {
        $match: { user: new mongoose.Types.ObjectId(userId) } // Replace userId with the actual user ID
      },
      {
        $unwind: "$items"
      },
      {
        $lookup: {
          from: "products", // Replace with the actual name of your Product collection
          localField: "items.product",
          foreignField: "_id",
          as: "product"
        }
      },
      {
        $unwind: "$product"
      },
      {
        $match:{'product.delete':false}
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: {
              $multiply: ["$product.price", "$items.quantity"]
            }
          }
        }
      }
    ]);
  
    delete req?.session?.giveWalletError
    let warning = req?.session?.warning ?? null
    let index = req?.session?.ind ?? null
  
    if(carts){
        
      res.render('user/cart',{user:userDetails,carts:carts,sum:cartTotal?.[0],warning,index});
    }else{
      res.render('user/cart',{stockMessage:'out of stock'});
    }
      
    } catch(error) {
      console.log(error);
      const customError = new Error('Somthing went wrong');
      customError.status = 500; // Set the desired status code
      customError.data = { additionalInfo: 'Additional information about the error' };
      next(customError);
    }
  }
  

exports.deleteCart = async (req,res,next) => {
    try {
      let id = req.params.id;
      console.log('hai from delete cart'+id)
      let deletingCart = await cartModel.findByIdAndDelete(id);
      if(deletingCart){
        res.status(200).json({succes:true});
      }else{
        res.status(400).json({ error: 'Address not found' });
      }
    } catch (error) {
      console.log(error)
      const customError = new Error('Somthing went wrong');
      customError.status = 500; // Set the desired status code
      customError.data = { additionalInfo: 'Additional information about the error' };
      next(customError);
    }
  }


exports.updateCartQuantityAndStock = async (req,res,next) => {
    try {
        let cartId = req?.params?.id;
        const {quantity,stock} = req.body
        console.log(req.body)
        console.log(quantity)
        let parsed = parseInt(quantity)
        let editedCart 
      if(parsed <= stock){
        delete req?.session?.warning
        delete req?.session?.ind
        editedCart = await cartModel.findByIdAndUpdate(
          { _id: cartId },
          {
            $set: {'items.0.quantity': parsed},
          },
          {new: true},
        )             
      }else if(parsed > stock){  
        req.session.ind = parseInt(ind)
        req.session.warning = "Out of stock";
        res.redirect('/home/bag');  
      }
       
  
        if(editedCart){
          delete req?.session?.warning
          delete req?.session?.ind
          // return res.status(200).json({quantity:true});
          res.redirect('/home/bag');
        }
       
    } catch (error) {
      console.log(error)
      const customError = new Error('Somthing went wrong');
      customError.status = 500; // Set the desired status code
      customError.data = { additionalInfo: 'Additional information about the error' };
      next(customError);
    }
  }