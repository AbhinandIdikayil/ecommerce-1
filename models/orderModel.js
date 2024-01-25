const mongoose = require('mongoose');

let orderSchema = mongoose.Schema({
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
        required:true,
    },
    address:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Address',
        required:true,
    },
    orderItems:[{
        productId:{
            type: mongoose.Schema.Types.ObjectId,
            ref:'product',
            required:true,
        },
        productPrice:{
            type:Number,
            required:true,
        },
        offer:{
            type:Number,
            required:true,
        },
        quantity:{
            type:Number,
            required:true
        },
        orderStatus:{
            type:String,
            enum: ["ordered", "shipped", "delivered","cancelled","pending"],
            required:true,
        },
     }],
    price:{
        type:Number,
        required:true,
    },
    paymentMethod:{
        type:String,
        required:true
    },
    orderDate:{
        type:Date,
        default:Date.now(),
    },
    deliveredDate:{
        type:Date,
    }
})

module.exports = mongoose.model('Order',orderSchema)
