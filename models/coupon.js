const mongoose = require('mongoose');

const couponSchema = mongoose.Schema({
    couponcode:{
        type:String,
        required:true,
    },
    minprice:{
        type:Number,
        required:true,
    }, 
    discount:{
        type:Number,
        required:true
    },
    status:{
        type:Boolean,
        default:false,
    },
    isExpired:{
        type:Boolean,
        default:false,
    },
    createdAt:{
        type:Date,
        default:Date.now()
    },
    expiryDate:{
        type:Date,
        required:true,
    }
})

module.exports = mongoose.model('Coupon',couponSchema); 