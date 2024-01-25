
const multer = require('multer');
const fs = require('fs'); 
const productModel = require('../models/productModel');
const userModel = require('../models/userModel')
const categoryModel = require('../models/category');
const createError = require('http-errors');
const orderModel = require('../models/orderModel');
const banneModel = require('../models/bannerModel')

const mongoose = require('mongoose');
const { error } = require('console');
const { use } = require('../routes/adminRoute');
const addressModel = require('../models/addressModel');
const couponModel = require('../models/coupon');
const bannerModel = require('../models/bannerModel');

let credinals = {
    emial:"admin@gmail.com",
    password:"admin123"
}
exports.loadHome = async (req,res) => {
    if(req.session.admin){
        res.render('admin/home')
    }else{
        res.redirect('/admin')
    }
}

exports.getLogin = async (req,res) => {
    if(req.session.admin){
        res.redirect('/admin/home')
    }else{
        res.render('admin/login');
    }
};

exports.postLogin = async (req,res) => { 
    let {email,password} =req.body;
    try {
        if(email === credinals.emial && password === credinals.password)
        {
            req.session.admin = true;
            res.redirect('/admin/home')
        }else{
            res.render('admin/login',{message:'username or password is incorrect'})
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' }); 
    }
}

exports.getProducts = async (req,res) => {
   try {
    let category = await categoryModel.find();
    let productList = await productModel.find().populate('category').sort({createdOn:-1});

    res.render('admin/page-products-list',{product:productList,category:category});
   } catch (error) {
    console.log(error)
   }
}

exports.postAddProduct = async (req, res, next) => {
    try {
      const { productname, productcategory, productprice, productstock, productsection , description ,productoffer} = req.body;
      const productimages = await req.files.map((file) => file.filename);
      let addedProduct;
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
      console.log(error);
    }
  };
  

exports.showUsers = async (req,res) => {
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
        res.status(500).json({ message: 'Internal Server Error' });
    }
}

exports.blockUser = async (req,res) => {
    try {
        let id  = req.params.id;
        let user = await userModel.findByIdAndUpdate(id,{blocked:true});
        if(user){
            res.redirect('/admin/user-list');
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
}

exports.unblockUser = async (req,res) => {
    try {
        let id  = req.params.id;
        let user = await userModel.findByIdAndUpdate(id,{blocked:false});
        if(user){
            res.redirect('/admin/user-list');
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
}


exports.showCategory = async (req,res) => {
    try {
        let category = await categoryModel.find();
        res.render('admin/category',{category:category});
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
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

exports.getUnlistCategory = async (req,res)=> {
    try {
        let category = await categoryModel.find();
        res.render('admin/unlistCategory',{category:category})
    } catch (error) {
        console.log(error);
    }
}

exports.updateUnlistCategory = async (req,res) => {
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
        console.log(error)
    }
}


exports.deleteCategory = async (req,res) => {
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
        res.status(500).json({ message: 'Internal Server Error' });
    }
}


exports.getEditCategory  = async (req,res) => {
    try {
        let id = req.params.id;
        let category = await categoryModel.findById(id)
        res.render('admin/editCategory',{category:category});
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
}

exports.postEditCategory = async (req,res) => {
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
        res.status(500).json({ message: 'Internal Server Error' });
    }   
}


exports.deleteProduct = async (req,res) => {
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
        res.status(500).json({ message: 'Internal Server Error' });
    }
}


exports.getEditProduct = async (req,res) => {
    try {
        let id =req.params.id;
        let category = await categoryModel.find()
        let product = await productModel.findOne({_id:id}).populate('category')
        console.log(product)
        res.render('admin/editProduct',{product:product,category:category})
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
}
exports.deleteImages = async (req,res) => {
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
    }
}
exports.postEditProduct = async (req,res) => {
    try {
        console.log('in post')
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
            ...(productsection && { category: categoryId }),
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
        res.status(500).json({ message: 'Internal Server Error' });
    }
}



exports.getUnlistProduct = async(req,res) => {
     try {
        let product = await productModel.find().populate('category')
        let category = await categoryModel.find();
        return res.render('admin/unlistProduct',{product:product,category:category})
     } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
     }
}


exports.postUnlistProduct = async (req,res) => {
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
        res.status(500).json({ message: 'Internal Server Error' });
    }
}

exports.getOrders = async (req,res) => {
    try {
        let orders = await orderModel.aggregate([
           
            {
                $lookup:{
                    from:addressModel.collection.name,
                    localField:'address',
                    foreignField:'_id',
                    as:'user_address'
                }
            },
            {
                $unwind:'$user_address'
            },
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
    }
}

exports.editOrder = async (req,res) => {
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
            {  // getting address details
                $lookup:{
                    from:addressModel.collection.name,
                    localField:'address',
                    foreignField:'_id',
                    as:'address_Details'
                }
            },
            {
                $unwind:'$address_Details'
            },
        ])
        console.log('from find order')
        console.log(findOrder)
        if(findOrder){
            res.render('admin/editOrderDetails',{order:findOrder}); 
        }
    } catch (error) {
        console.log(error)
    }
}
exports.postEditOrder = async (req,res) => {
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
    }
}

// for banner mangement 
exports.banner = async (req,res) => {
    try {
        let banners = await bannerModel.find();
        res.render("admin/banner",{banners})
    } catch (error) {
        console.log(error)
    }
}

exports.getAddBanner = async (req,res) => {
    try {
        let products = await productModel.find({delete:false});
        res.render('admin/addBanner',{products})
    } catch (error) {
        console.log(error)
    }
}

exports. postAddBanner = async (req,res) => {
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
        console.log(error)
    }
}


exports.getError = async (req,res) => {
    try {
        res.render('error')
    } catch (error) {
        console.log(error)
    }
}
// for coupon management
exports.getCoupon = async (req,res) => {
    try {
        let coupons = await couponModel.find()
        res.render('admin/coupons',{coupons})
    } catch (error) {
        console.log(error)
    }   
}

exports.getAddCoupon = async(req,res) => {
    try {
        res.render('admin/Addcoupon')
    } catch (error) {
        console.log(error);
    }
}

exports.postAddCoupon = async(req,res) => {
    try {
        let {couponcode,minprice,discount,expDate} = req.body
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
    }
}

exports.deleteCoupon = async (req,res) => {
    try {
        let couponId = req.params.id;
        let deleted = await couponModel.findByIdAndDelete(couponId);
        res.redirect('/admin/coupon')
    } catch (error) {
        console.log(error);
    }
}

exports.signout = async (req,res) => {
    try {
        
    } catch (error) {
        
    }
}