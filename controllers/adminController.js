
const multer = require('multer');
const fs = require('fs'); 
const productModel = require('../models/productModel');
const userModel = require('../models/userModel')
const categoryModel = require('../models/category');
const createError = require('http-errors');
const orderModel = require('../models/orderModel');
const refferModel = require('../models/refferalModel')
const mongoose = require('mongoose');
const addressModel = require('../models/addressModel');
const couponModel = require('../models/coupon');
const bannerModel = require('../models/bannerModel');
const offerModel = require('../models/offerModel')

let credinals = {
    emial:"admin@gmail.com",
    password:"admin123"
}

exports.loadhome2 = async (req,res,next) => {
try {
    let labelObj = {};
    let salesCount;
    let findQuerry;
    let currentYear;
    let currentMonth;
    let index;
   
    switch (req.query.filter) {
    case "Weekly":
        currentYear = new Date().getFullYear();
        currentMonth = new Date().getMonth() + 1;

        labelObj = {
        Sun: 0,
        Mon: 1,
        Tue: 2,
        Wed: 3,
        Thu: 4,
        Fri: 5,
        Sat: 6,
        };

        salesCount = new Array(7).fill(0);

        findQuerry = {
        orderDate: {
            $gte: new Date(currentYear, currentMonth - 1, 1),
            $lte: new Date(currentYear, currentMonth, 0, 23, 59, 59),
        },
        };
        index = 0;
        break;
    case "Monthly":
        currentYear = new Date().getFullYear();
        labelObj = {
        Jan: 0,
        Feb: 1,
        Mar: 2,
        Apr: 3,
        May: 4,
        Jun: 5,
        Jul: 6,
        Aug: 7,
        Sep: 8,
        Oct: 9,
        Nov: 10,
        Dec: 11,
        };

        salesCount = new Array(12).fill(0);

        findQuerry = {
        orderDate: {
            $gte: new Date(currentYear, 0, 1),
            $lte: new Date(currentYear, 11, 31, 23, 59, 59),
        },
        };
        index = 1;
        break;

   
    case "Yearly":
        findQuerry = {};

        const ord = await orderModel.find().sort({ orderDate: 1 });
      
        const stDate = ord[0].orderDate.getFullYear();
        const endDate = ord[ord.length - 1].orderDate.getFullYear();
        
        for (let i = 0; i <= Number(endDate) - Number(stDate); i++) {
            
            labelObj[`${stDate + i}`] = i;
        }

        salesCount = new Array(Object.keys(labelObj).length).fill(0);

        index = 3;
        break;
    default:
       return res.redirect('/admin/home?filter=Weekly')
    }

    // const orders = await orderModel.find(findQuerry);

    const orders = await orderModel.aggregate(
    [
        {
        $match: findQuerry
        },
        {
        $unwind:'$orderItems'
        }
    ]
    );

    orders.forEach((order) => {
        salesCount[labelObj[String(order.orderDate).split(" ")[index]]] += 1;    
    });
    let productCount = await productModel.find({delete:false}).count()
    let categoryCount = await categoryModel.find({delete:false}).count()
    let revenue = await orderModel.aggregate([
        {
            $group:{
                _id:null,
                total:{$sum:'$price'}
            }
        }
    ])
    let order = await orderModel.aggregate([
        {
            $unwind:'$orderItems'
        },
        {
            $match:{'orderItems.orderStatus':'delivered'}
        },
        {
           $group:{
            _id:null,
            total:{$sum:1}
           } 
        }
    ]);
    let total = order[0]?.total || 0


    // category sales
    let category = await orderModel.aggregate([
        {
            $unwind:'$orderItems'
        },
        {
            $match:{'orderItems.orderStatus':'delivered'}
        },
        {
            $group:{
                _id:'$orderItems.category',
                total:{$sum:1}
            }
        }
    ]);
    
    res.render('admin/home',{
        category,
        order:total,
        revenue,
        productCount,
        categoryCount,
        list:Object.keys(labelObj),
        yaxis:salesCount,
        req,
        message:req.session.empty 
    })
  
    
} catch (err) {
    console.log(err);
    const customError = new Error('Somthing went wrong');
    customError.status = 500; // Set the desired status code
    customError.data = { additionalInfo: 'Additional information about the error' };
    next(customError);
}
      
}


exports.getLogin = async (req,res,next) => {
    try {
        res.render('admin/login');  
    } catch (error) {
        console.log(error)  
        const customError = new Error('Somthing went wrong');
        customError.status = 500; // Set the desired status code
        customError.data = { additionalInfo: 'Additional information about the error' };
        next(customError); 
    }
    
};

const jwt = require('jsonwebtoken');
const { resourceLimits } = require('worker_threads');

const maxAge = 3 * 24 * 60 * 30
function createToken  (id)  {
    return jwt.sign({id},process.env.JWT_SECRET,{
        expiresIn:maxAge
    })
}

exports.postLogin = async (req,res,next) => { 
    let {email,password} =req.body;
    try {
        if(email === credinals.emial && password === credinals.password)
        {
            const adminToken = createToken(credinals.emial);
            res.cookie('admin-token',adminToken,{
                httpOnly: true,
                maxAge:maxAge * 1000,
            })
            console.log('in post')
            res.redirect('/admin/home?filter=Weekly')
        }else{
            res.render('admin/login',{message:'username or password is incorrect'})
        }
    } catch (error) {
        console.log(error);
        const customError = new Error('Somthing went wrong');
        customError.status = 500; // Set the desired status code
        customError.data = { additionalInfo: 'Additional information about the error' };
        next(customError);
    }
}

exports.getProducts = async (req,res,next) => {
    delete req.session.empty
   try {
    let category = await categoryModel.find();
    let productList = await productModel.find().populate('category').sort({createdOn:-1});

    res.render('admin/page-products-list',{product:productList,category:category});
   } catch (error) {
    const customError = new Error('Somthing went wrong');
    customError.status = 500; // Set the desired status code
    customError.data = { additionalInfo: 'Additional information about the error' };
    next(customError);
   }
}

exports.postAddProduct = async (req, res, next) => {
    try {
      const { productname, productcategory, productprice, productstock, productsection , description ,productoffer} = req.body;
      const productimages = await req.files.map((file) => file.filename);
      let addedProduct;
      console.log(req.body)
    //   checking is there any value in productoffer input
      if(productoffer){
        let offerPrice = productprice - (productoffer/100) * productprice
        console.log(offerPrice)
        addedProduct = new productModel({  
            productname,
            category:productcategory,
            description,
            section:productsection,
            price:offerPrice,
            stock:productstock,
            images:productimages,
            offer:productoffer,
            originalprice:productprice,
          })
      }else{
        addedProduct = new productModel({
            productname,
            category:productcategory,
            description,
            section:productsection,
            price:productprice,
            stock:productstock,
            images:productimages,
            originalprice:productprice,
        })
      }
      await addedProduct.save();   
      res.redirect('/admin/page-products-list')
    } catch (error) {
        const customError = new Error('Somthing went wrong');
        customError.status = 500; // Set the desired status code
        customError.data = { additionalInfo: 'Additional information about the error' };
        next(customError);
    }
  };
  

exports.showUsers = async (req,res,next) => {
    delete req.session.empty
    try {
        let search = '';
        if (req.query.search) {
            search = req.query.search;
        }

        let userData;

        if (search) {
            userData = await userModel.find({
                $or: [
                    { firstname: { $regex: '.*' + search + '.*', $options: 'i' } },
                    { email: { $regex: '.*' + search + '.*', $options: 'i' } },
                ]
            }); 
        } else {
            userData = await userModel.find();
        }
        res.render('admin/user-list',{user:userData})
       
    } catch (error) {
        console.log(error);
        const customError = new Error('Somthing went wrong');
    customError.status = 500; // Set the desired status code
    customError.data = { additionalInfo: 'Additional information about the error' };
    next(customError);
    }
}

exports.blockUser = async (req,res,next) => {
    try {
        let id  = req.params.id;
        let user = await userModel.findByIdAndUpdate(id,{blocked:true});
        if(user){
            res.redirect('/admin/user-list');
        }
    } catch (error) {
        console.log(error);
        const customError = new Error('Somthing went wrong');
        customError.status = 500; // Set the desired status code
        customError.data = { additionalInfo: 'Additional information about the error' };
        next(customError);
    }
}

exports.unblockUser = async (req,res,next) => {
    try {
        let id  = req.params.id;
        let user = await userModel.findByIdAndUpdate(id,{blocked:false});
        if(user){
            res.redirect('/admin/user-list');
        }
    } catch (error) {
        console.log(error);
        const customError = new Error('Somthing went wrong');
        customError.status = 500; // Set the desired status code
        customError.data = { additionalInfo: 'Additional information about the error' };
        next(customError);
    }
}


exports.showCategory = async (req,res,next) => {
    delete req.session.empty
    try {
        let category = await categoryModel.find();
        res.render('admin/category',{category:category});
    } catch (error) {
        console.log(error);
        const customError = new Error('Somthing went wrong');
        customError.status = 500; // Set the desired status code
        customError.data = { additionalInfo: 'Additional information about the error' };
        next(customError);
    }
}


exports.addCategory = async (req,res,next) => {
    try {
        let {categoryname} = req.body;
        let trimmed = categoryname.toLowerCase().trim(' ');
        console.log(trimmed);
        let existingCategory = await categoryModel.find({ categoryname: trimmed } );
        console.log(existingCategory.length);
        if(existingCategory !== null && existingCategory.length >= 1){
            return res.json({success:true});
        }  

        let newCategory =  new categoryModel({
            categoryname:trimmed,
        })
        let saved = await newCategory.save();
      
        if(saved){   
            res.redirect('/admin/category');
        }
    } catch (error) {
        console.log(error);
        const customError = new Error('Somthing went wrong');
        customError.status = 500; // Set the desired status code
        customError.data = { additionalInfo: 'Additional information about the error' };

        next(customError);
    }
}

exports.getUnlistCategory = async (req,res,next)=> {
    try {
        let category = await categoryModel.find();
        res.render('admin/unlistCategory',{category:category})
    } catch (error) {
        const customError = new Error('Somthing went wrong');
        customError.status = 500; // Set the desired status code
        customError.data = { additionalInfo: 'Additional information about the error' };
        next(customError);
    }
}

exports.updateUnlistCategory = async (req,res,next) => {
    try {
        let id = req.params.id;
        let update = {
            delete:false,
        }
        let unlistCategory = await categoryModel.findByIdAndUpdate(
            id,
            {$set:update},
            {new:true},
        )
        if(unlistCategory){
            res.redirect('/admin/category');
        }
    } catch (error) {
        const customError = new Error('Somthing went wrong');
        customError.status = 500; // Set the desired status code
        customError.data = { additionalInfo: 'Additional information about the error' };
        next(customError);
    }
}


exports.deleteCategory = async (req,res,next) => {
    try {
        let id = req.params.id;
        let delt = await categoryModel.findByIdAndUpdate(
            id,
            {delete:true},
            {new:true}
        )
        if(delt){
            res.redirect('/admin/category')
        }
    } catch (error) {
        console.log(error);
        const customError = new Error('Somthing went wrong');
        customError.status = 500; // Set the desired status code
        customError.data = { additionalInfo: 'Additional information about the error' };
        next(customError);
    }
}


exports.getEditCategory  = async (req,res,next) => {
    try {
        let id = req.params.id;
        let category = await categoryModel.findById(id)
        res.render('admin/editCategory',{category:category});
    } catch (error) {
        console.log(error);
        const customError = new Error('Somthing went wrong');
        customError.status = 500; // Set the desired status code
        customError.data = { additionalInfo: 'Additional information about the error' };
        next(customError);
    }
}

exports.postEditCategory = async (req,res,next) => {
    try {
        let id = req.params.id;
        let {categoryname} = req.body;
        let name = categoryname.toLowerCase().replace(/\s+/g, ' ').trim('')
        console.log(name)
        let existingCategory = await categoryModel.find({categoryname:name})
        console.log(id)
        console.log(existingCategory)
        if(existingCategory.length > 0){
            if(existingCategory !==null && existingCategory[0]._id !== id){
                console.log('fasdf ')
                return res.json({failed:true})
            }
        }
        
        let category = await categoryModel.findByIdAndUpdate(
            id,
            {categoryname},
            {new:true},
        );

        if(category){
            console.log(req.method)
            res.json( { success: true });
        }
        
    } catch (error) {
        console.log(error);
        const customError = new Error('Somthing went wrong');
        customError.status = 500; // Set the desired status code
        customError.data = { additionalInfo: 'Additional information about the error' };
        next(customError);
    }   
}


exports.deleteProduct = async (req,res,next) => {
    try {
        let id = req.params.id;
        let product = await productModel.findByIdAndUpdate(
            id,
            {delete:true},
            {new:true}
        )
        if(product){
            console.log('hai')
            res.json({success:true})
        }else{
            console.log('haii')
        }
    } catch (error) {
        console.log(error);
        const customError = new Error('Somthing went wrong');
        customError.status = 500; // Set the desired status code
        customError.data = { additionalInfo: 'Additional information about the error' };
        next(customError);
    }
}


exports.getEditProduct = async (req,res,next) => {
    delete req.session.empty
    try {
        let id =req.params.id;
        let category = await categoryModel.find()
        let product = await productModel.findOne({_id:id}).populate('category')
        console.log(product)
        res.render('admin/editProduct',{product:product,category:category})
    } catch (error) {
        console.log(error);
        const customError = new Error('Somthing went wrong');
        customError.status = 500; // Set the desired status code
        customError.data = { additionalInfo: 'Additional information about the error' };
        next(customError);
    }
}
exports.deleteImages = async (req,res,next) => {
    try {
       
        let proId = req.params.proId;
        let image = req.params.image;
       
        
        console.log(image)
        let product = await productModel.findByIdAndUpdate(
            proId,
            {$pull:{images:image}},
            {new:true}
        )
        if(product){
            res.json({success:true});
        }
    } catch (error) {
        console.log(error);
        const customError = new Error('Somthing went wrong');
        customError.status = 500; // Set the desired status code
        customError.data = { additionalInfo: 'Additional information about the error' };
        next(customError);
    }
}
exports.postEditProduct = async (req,res,next) => {
    try {
        let id = req.params.id;
        let {productname,productprice,productstock,
            productcategory,productsection,productDescription,
            originalprice,offerInPercentage} = req.body;
        const productimages = await req.files.map((file) => file.filename);
      
        if (!mongoose.Types.ObjectId.isValid(productcategory)) {
            return res.status(400).send('Invalid product category ID');
        }
        const existingProduct = await productModel.findById(id)
        const categoryId = new  mongoose.Types.ObjectId(productcategory);
        let existingImages = existingProduct.images || [];
        let updatedImages = existingImages.concat(productimages);

        let afterOfferPrice = 0;
        let offer = parseInt(offerInPercentage);  
        if( offer > 0 ){
            afterOfferPrice = parseInt(originalprice) - (parseInt(offer)/100) * parseInt( originalprice)
        }else{
            afterOfferPrice = parseInt(originalprice) - (parseInt(offer)/100) * parseInt( originalprice)
        }
        
        const updatedProduct = {
            ...(productname && { productname }), 
            ...(productcategory && { category: categoryId }),
            ...(productsection && { section:productsection }),
            ...(productDescription && { description: productDescription }),
            ...(productprice && { price: afterOffer }),
            ...(productstock && { stock:productstock }),
            ...(afterOfferPrice && {price:afterOfferPrice}),
            ...(offerInPercentage && {offer:offerInPercentage}),
            ...(originalprice && {originalprice}),
            ...(productimages.length > 0 && { images: updatedImages }),
        }
        console.log(updatedProduct);

        console.log(updatedProduct + 'updated document')
        let updatedProductList = await productModel.findByIdAndUpdate(
            id,
            {$set:updatedProduct},
            {new:true}
        )
        if(updatedProductList){
            console.log('success')
            res.redirect('/admin/page-products-list')
        }

    } catch (error) {
        console.log(error);
        const customError = new Error('Somthing went wrong');
        customError.status = 500; // Set the desired status code
        customError.data = { additionalInfo: 'Additional information about the error' };
        next(customError);
    }
}



exports.getUnlistProduct = async(req,res,next) => {
     try {
        let product = await productModel.find().populate('category')
        let category = await categoryModel.find();
        return res.render('admin/unlistProduct',{product:product,category:category})
     } catch (error) {
        console.log(error);
        const customError = new Error('Somthing went wrong');
        customError.status = 500; // Set the desired status code
        customError.data = { additionalInfo: 'Additional information about the error' };
        next(customError);
    }
}


exports.postUnlistProduct = async (req,res,next) => {
    try {
        let id = req.params.id;
        let restore = {
            delete:false,
        }
        let product =await productModel.findByIdAndUpdate(
            id,
            {$set:restore},
            {new:true},
        );
            
        if(product){
            res.redirect('/admin/page-products-list')
        }

    } catch (error) {
        console.log(error);
        const customError = new Error('Somthing went wrong');
        customError.status = 500; // Set the desired status code
        customError.data = { additionalInfo: 'Additional information about the error' };
        next(customError);
    }
}

exports.getOrders = async (req,res,next) => {
    delete req.session.empty
    try {
        let orders = await orderModel.aggregate([
            {
                $lookup:{
                    from:userModel.collection.name,
                    localField:'user',
                    foreignField:'_id',
                    as:'user_details',
                }
            },
            {
                $unwind:'$user_details'
            },
            {   // getting the ordered product
                $unwind:'$orderItems'
            },
            {
                $lookup:{
                    from:productModel.collection.name,
                    localField:'orderItems.productId',
                    foreignField:'_id',
                    as:'product_Details'
                }
            },
            {
                $unwind:'$product_Details'
            }
        ]);
        console.log(orders)
        res.render('admin/ordersList',{order:orders})
    } catch (error) {
        console.log(error)
        const customError = new Error('Somthing went wrong');
        customError.status = 500; // Set the desired status code
        customError.data = { additionalInfo: 'Additional information about the error' };
        next(customError);
    }
}

exports.editOrder = async (req,res,next) => {
    try {
        
        let id = req.params.id;
        let productId = req.query.proId
        
        let findOrder = await orderModel.aggregate([
            {
                $match:{_id: new mongoose.Types.ObjectId(id)}
            },
            { // getting ordered product details
                $unwind:'$orderItems'
            }, 
            {
                $match:{'orderItems.productId':new mongoose.Types.ObjectId(productId)}
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
            { // getting user detials with lookup
                $lookup:{
                    from:userModel.collection.name,
                    localField:'user',
                    foreignField:'_id',
                    as:'user_Details'
                }
            },
            {
                $unwind:'$user_Details'
            },
        ])
        console.log('from find order')
        console.log(findOrder)
        if(findOrder){
            res.render('admin/editOrderDetails',{order:findOrder}); 
        }
    } catch (error) {
        console.log(error)
        const customError = new Error('Somthing went wrong');
        customError.status = 500; // Set the desired status code
        customError.data = { additionalInfo: 'Additional information about the error' };
        next(customError);
    }
}
exports.postEditOrder = async (req,res,next) => {
    try {
        let orderId = req.params.id;
        let productId = req.query.proId;
        console.log(orderId,productId)
        const {orderStatus} = req.body
        console.log(orderStatus);
        let Order = await orderModel.aggregate([
            {
                $match:{_id:new mongoose.Types.ObjectId(orderId)}
            },
            {
                $unwind:'$orderItems'
            }, 
            {
                $match:{'orderItems.productId':new mongoose.Types.ObjectId(productId)}
            },
        ])
        
        if(Order.length>0 && orderStatus !== 'delivered' ){
            let updatedOrder  = Order.map(async (order) => {
                await orderModel.updateOne(
                {
                    _id:order._id,
                    'orderItems':{
                        $elemMatch:{productId:productId}
                    }
                },
                {
                    $set:{'orderItems.$.orderStatus': orderStatus}
                })
            })  
            let saved = await Promise.all(updatedOrder);
            if(saved){
                res.redirect('/admin/order-list')
            }
        }else{
            let updatedOrder  = Order.map(async (order) => {
                await orderModel.updateOne(
                {
                    _id:order._id,
                    'orderItems':{
                        $elemMatch:{productId:productId}
                    }
                },
                {
                    $set:{'orderItems.$.orderStatus': orderStatus,deliveredDate:Date.now()}
                })
            })  
            let saved = await Promise.all(updatedOrder);
            if(saved){
                res.redirect('/admin/order-list')
            }
        }

        console.log(Order)
    } catch (error) {
        console.log(error);
        const customError = new Error('Somthing went wrong');
        customError.status = 500; // Set the desired status code
        customError.data = { additionalInfo: 'Additional information about the error' };
        next(customError);
    }
}

// for banner mangement 
exports.banner = async (req,res,next) => {
    delete req.session.empty
    try {
        let banners = await bannerModel.find();
        res.render("admin/banner",{banners})
    } catch (error) {
        console.log(error)
        const customError = new Error('Somthing went wrong');
        customError.status = 500; // Set the desired status code
        customError.data = { additionalInfo: 'Additional information about the error' };
        next(customError);
    }
}

exports.getAddBanner = async (req,res,next) => {
    try {
        let products = await productModel.find({delete:false});
        res.render('admin/addBanner',{products})
    } catch (error) {
        console.log(error)
        const customError = new Error('Somthing went wrong');
        customError.status = 500; // Set the desired status code
        customError.data = { additionalInfo: 'Additional information about the error' };
        next(customError);
    }
}

exports. postAddBanner = async (req,res,next) => {
    try {
        const {bannerTitle,startDate,endDate,image,productRoute} = req.body;
        let SingleImage = req.file;
        let banner = await bannerModel.create({
            bannerTitle,
            startDate,
            endDate,
            productRoute,
            image:SingleImage.filename
        })
        let save = await banner.save()
        res.redirect('/admin/banner')
    } catch (error) {
        console.log(error);
        const customError = new Error('Somthing went wrong');
        customError.status = 500; // Set the desired status code
        customError.data = { additionalInfo: 'Additional information about the error' };
        next(customError);
    }
}


exports.getError = async (req,res,next) => {
    try {
        res.render('error')
    } catch (error) {
        console.log(error)
        const customError = new Error('Somthing went wrong');
        customError.status = 500; // Set the desired status code
        customError.data = { additionalInfo: 'Additional information about the error' };
        next(customError);
    }
}
// for coupon management
exports.getCoupon = async (req,res,next) => {
    delete req.session.empty
    try {
        let coupons = await couponModel.find()
        res.render('admin/coupons',{coupons})
    } catch (error) {
        console.log(error)
        const customError = new Error('Somthing went wrong');
        customError.status = 500; // Set the desired status code
        customError.data = { additionalInfo: 'Additional information about the error' };
        next(customError);
    }   
}

exports.getAddCoupon = async(req,res,next) => {
    try {
        res.render('admin/Addcoupon')
    } catch (error) {
        console.log(error);const customError = new Error('Somthing went wrong');
        customError.status = 500; // Set the desired status code
        customError.data = { additionalInfo: 'Additional information about the error' };
        next(customError);
    }
}

exports.postAddCoupon = async(req,res,next) => {
    try {
        let {couponcode,minprice,discount,expDate} = req.body
        let existingCoupon = await couponModel.findOne({couponcode});
        if(existingCoupon){
           return res.render('admin/Addcoupon',{message:'Coupon code exists'})
        }
        let coupon = await couponModel.create({
            couponcode,
            minprice:parseInt(minprice),
            discount:parseInt(discount),
            expiryDate:expDate
        });
        let saved = await coupon.save();
        res.redirect('/admin/coupon');
    } catch (error) { 
        console.log(error);
        const customError = new Error('Somthing went wrong');
        customError.status = 500; // Set the desired status code
        customError.data = { additionalInfo: 'Additional information about the error' };
        next(customError);
    }
}

exports.deleteCoupon = async (req,res,next) => {
    try {
        let couponId = req.params.id;
        let deleted = await couponModel.findByIdAndDelete(couponId);
        res.redirect('/admin/coupon')
    } catch (error) {
        console.log(error);
        const customError = new Error('Somthing went wrong');
        customError.status = 500; // Set the desired status code
        customError.data = { additionalInfo: 'Additional information about the error' };
        next(customError);
    }
}

exports.signout = async (req,res,next) => {
    try {
        res.cookie('admin-token','',{maxAge:1})
        res.redirect('/admin')
    } catch (error) {
        console.log(error);
        const customError = new Error('Somthing went wrong');
        customError.status = 500; // Set the desired status code
        customError.data = { additionalInfo: 'Additional information about the error' };
        next(customError);
    }
}
exports.getRefferal = async (req,res,next) => {
    delete req.session.empty
    try {
        let refferal = await refferModel.find()
        res.render('admin/referralpage',{reffer:refferal})
    } catch (error) {
        console.log(error);
        const customError = new Error('Somthing went wrong');
        customError.status = 500; // Set the desired status code
        customError.data = { additionalInfo: 'Additional information about the error' };
        next(customError);
    }
}
exports.getRefferalForm = async (req,res,next) => {
    try {
        res.render('admin/refferForm')
    } catch (error) {
        console.log(error);
        const customError = new Error('Somthing went wrong');
        customError.status = 500; // Set the desired status code
        customError.data = { additionalInfo: 'Additional information about the error' };
        next(customError);
    }
}
exports.postReffer = async (req,res,next) => {
    try {
        const {refferalamount,refferedamount,expires,description} = req.body;
        let newReffer = {
            refferalamount,
            refferedamount,
            description,
            expires
        }
        let saved = await refferModel.findOneAndReplace({}, newReffer, { upsert: true, new: true });
        if(saved){
            res.redirect('/admin/refferal');
        }
        
    } catch (error) {
        console.log(error);
        const customError = new Error('Somthing went wrong');
        customError.status = 500; // Set the desired status code
        customError.data = { additionalInfo: 'Additional information about the error' };
        next(customError);
    }
}

exports.getOffer = async (req,res,next) => {
    delete req.session.empty
    try {
        let offers = await offerModel.find().populate('categoryId')
        res.render('admin/categoryOffers',{offers})
        // updateCategoryOfferInProduct('65bcd4a639b0270c0e0d15df')
    } catch (error) {
        console.log(error)
        const customError = new Error('Somthing went wrong');
        customError.status = 500; // Set the desired status code
        customError.data = { additionalInfo: 'Additional information about the error' };
        next(customError);
    }
}
exports.getOfferForm = async (req,res,next) => {
    try {
        let categories = await categoryModel.find({delete:false})
        res.render('admin/addOffer',{categories})
    } catch (error){
        console.log(error);
        const customError = new Error('Somthing went wrong');
        customError.status = 500; // Set the desired status code
        customError.data = { additionalInfo: 'Additional information about the error' };
        next(customError);
    }
}
exports.postOfferForm = async (req,res,next) => {
    try {
        let {offer,categoryid} = req.body;
        if(offer && categoryid){
            let parsedOffer = parseInt(offer)
            if(parsedOffer < 1 && parsedOffer > 99){
                return res.render('admin/addOffer',{message:'offer should be between 1 and 99'})
            }
            let newOffer = new offerModel({
                categoryId:categoryid,
                offer:parsedOffer,
            })
            let saved = await newOffer.save(); 
            let products = await productModel.updateMany({category:categoryid},{categoryOffer:saved._id});
            res.redirect('/admin/offer');
            
        }else{
            return res.render('admin/addOffer',{message:'Please enter offer'})
        }
    } catch (error) {
        console.log(error);
        const customError = new Error('Somthing went wrong');
        customError.status = 500; // Set the desired status code
        customError.data = { additionalInfo: 'Additional information about the error' };
        next(customError);
    }   
}
exports.unlistOffer = async (req,res,next) => {
    try {
        let offerId = req.params.offerId
        let updated = await offerModel.findOneAndUpdate(
            {_id:offerId},
            {$set:{delete:true}},
            {new:true}
        );
        let id = updated.catgoryId
        updateCategoryOfferInProduct(offerId,0)
       
        res.status(200).json({success:true})
    } catch (error) {
        console.log(error);
        const customError = new Error('Somthing went wrong');
        customError.status = 500; // Set the desired status code
        customError.data = { additionalInfo: 'Additional information about the error' };
        next(customError);
    }
}
exports.listOffer = async (req,res,next) => {
    try {
        let offerId = req.params.offerId;
        let updated = await offerModel.updateOne(
            {_id:offerId},
            {$set:{delete:false}},
        );
        updateCategoryOfferInProduct(offerId,updated.offer)
        res.status(200).json({success:true})
    } catch (error) { 
        console.log(error);
        const customError = new Error('Somthing went wrong');
        customError.status = 500; // Set the desired status code
        customError.data = { additionalInfo: 'Additional information about the error' };
        next(customError);
    }
}
async function updateCategoryOfferInProduct(id,changePrice){
    try {
        console.log(changePrice);
        let products = await productModel.find({categoryOffer:id}).populate('categoryOffer')
        for (const product of products) {
            let offer = 0;
            if(changePrice === 0){
                offer = 0;
            }else{
                offer = product.categoryOffer.offer;
            }
            console.log(offer)
            let priceAfterOffer = parseInt(product.originalprice - (product.originalprice * (offer / 100)))
            console.log(priceAfterOffer)
            let updatedProduct = await productModel.updateOne(
                {_id:product._id},
                {$set:{price:priceAfterOffer}},
                {new:true}
            )
        }
    } catch (error) {
        console.log(error);
        const customError = new Error('Somthing went wrong');
        customError.status = 500; // Set the desired status code
        customError.data = { additionalInfo: 'Additional information about the error' };
        next(customError);
    }
}

const CsvParser = require('json2csv').Parser;
//Sales Report
exports.downloadSalesReport = async (req, res, next) => {
    try {
      console.log("salesreport");
      const fromDate = req.query.fromDate
      const toDate = req.query.toDate
  
      console.log(fromDate, toDate);
      const agg = [
        {
          $unwind: "$orderItems"
        },
        {
          $match: {
            "orderDate": { $gte: new Date(fromDate), $lte: new Date(toDate) },
          },
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
          $sort: {
            orderDate: -1,
          },
        },
  
      ]
      const results = await orderModel.aggregate(agg);
      console.log(results)
      if(results.length <= 0){
        req.session.empty = 'No sales are available'
        return res.redirect('/admin/home?filter=Weekly')
      }
      const users = [];
      let count = 1;
      
      results.forEach((orders) => {
        orders.sI = count;
        users.push({
          SI: orders.sI,
          "Orders ID": orders._id,
          "Order Date": orders.orderDate.toISOString().split("T")[0],
          "Product Name": orders.productDetails.productname,
          "Price of a unit": orders.orderItems.productPrice,
          "Qty": orders.orderItems.quantity,
          "Payment Method": orders.paymentMethod,
          "Total amount": orders.orderItems.quantity * orders.orderItems.productPrice,
        });
        count++;
      });
      console.log(users);
      // const csv = new CsvParser(results);
      const csvFields = [
        "SI",
        "Orders ID",
        "Order Date",
        "Product Name",
        "Price of a unit",
        "Qty",
        "Payment Method",
        "Total amount",
      ];
      const csvParser = new CsvParser({ csvFields });
      let csvData = csvParser.parse(users);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        "attatchment: filename=salesReport.csv"
      );
        
      res.send(csvData);
    } catch (error) {
      // res.send(error) 
      console.log(error);
      const customError = new Error('Somthing went wrong');
      customError.status = 500; // Set the desired status code
      customError.data = { additionalInfo: 'Additional information about the error' };
      next(customError);
    }
  }