const orderModel = require('../models/orderModel');
const userModel = require('../models/userModel');
const productModel = require('../models/productModel');
const addressModel = require('../models/addressModel');
const walletModel = require('../models/wallet')
const mongoose = require('mongoose')
const puppeteer = require('puppeteer-core')
const fsExtra = require('fs-extra')
const fs = require('fs')
const path = require('path')
const ejs = require('ejs');
const wallet = require('../models/wallet');


exports.cancelOrder = async (req,res,next) => {
try {
    let id = req.params?.id;
    const {quantity} = req.body;
    let stock = parseInt(quantity)
    let user = await userModel.findOne({email:req.session?.email});
    let userId = user._id
    let productId = new mongoose.Types.ObjectId(id);
    let orderId = new mongoose.Types.ObjectId(req.params?.orderId)
 
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
    if(cancelledOrderData[0].paymentMethod !== 'cash-on-delivery'){
        let orderAmount = cancelledOrderData?.[0].orderItems.productPrice;
        let wallet = await walletModel.findOneAndUpdate({user:userId},{$inc:{walletbalance:orderAmount}})
    }  

    // Step 2: Perform a separate update operation
    if (cancelledOrderData?.length > 0) {
    let updatePromises = cancelledOrderData?.map(async (doc) => {
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
    console.log(error)
    const customError = new Error('Somthing went wrong');
    customError.status = 500; // Set the desired status code
    customError.data = { additionalInfo: 'Additional information about the error' };
    next(customError);
}
}



exports.getOrders = async (req,res,next) => {
try {
    let user = await userModel.findOne({email:req.session.email});
    let userId = user._id

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
        $sort:{orderDate:-1}
    },
    {
        $project:{orderItems:1,orderStatus:1,paymentMethod:1,productDetails:1,orderDate:1,price:1,address:1}
    }
    ])

    res.render('user/orders',{user:user,order:orders});
} catch (error) {
    console.log(error)
    const customError = new Error('Somthing went wrong');
    customError.status = 500; // Set the desired status code
    customError.data = { additionalInfo: 'Additional information about the error' };
    next(customError);
}
}


exports.getOrderSummary = async (req,res,next) => {
try {
    let id = req.params?.id;
    let orderId = req.query?.order

    let userDetails = await userModel.findOne({email:req.session.email});
    let product = await productModel.findById(id);
    let order = await orderModel.aggregate([
    {
        $match:{_id:new mongoose.Types.ObjectId(orderId)}
    },
    {
        $unwind:"$orderItems"
    },
    ])
    console.log('from order summary')
    console.log(order)
    res.render('user/orderDetails',{user:userDetails,product,order});
} catch (error) {
    console.log(error)
    const customError = new Error('Somthing went wrong');
    customError.status = 500; // Set the desired status code
    customError.data = { additionalInfo: 'Additional information about the error' };
    next(customError);
}
}




  
exports.puppeteerInvoice = async (req,res,next) => {
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
    const browser = await puppeteer.launch({ headless: "new", executablePath: "/snap/bin/chromium" });
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
    console.log(error)
    const customError = new Error('Somthing went wrong');
    customError.status = 500; // Set the desired status code
    customError.data = { additionalInfo: 'Additional information about the error' };
    next(customError);
}
}

exports.returnOrder = async (req,res,next) => {
    try {
    let offerId = req.params.orderId;
    let orderItemId = req.params.orderItemId;
    const {reason} = req.body;
  
    let returnedOrder = await orderModel.aggregate([
        {
            $match:{_id:new mongoose.Types.ObjectId(offerId)}
        },
        {
            $unwind:'$orderItems'
        },
        {
            $match:{'orderItems._id':new mongoose.Types.ObjectId(orderItemId)}
        },
    ])
    let updatePromises
    if (returnedOrder.length > 0) {
        updatePromises = returnedOrder.map(async (doc) => {
            await orderModel.updateOne(
            {
                _id: doc._id,
                'orderItems._id': new mongoose.Types.ObjectId(orderItemId)
            },
            {
                $set: { 'orderItems.$.orderStatus': 'returned','orderItems.$.returnreason':reason},
            }
            );
        });
    }
    let saved = await Promise.all(updatePromises);
    res.redirect('/home/account/orders')
    } catch (error) {
        console.log(error)
        const customError = new Error('Somthing went wrong');
        customError.status = 500; // Set the desired status code
        customError.data = { additionalInfo: 'Additional information about the error' };
        next(customError);
    }
}