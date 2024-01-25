const mongoose = require('mongoose');

let wallet = mongoose.Schema({
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
        required:true,
    },
    walletbalance:{
        type:Number,
        required:true,
        default:0,
    }, 
    transactions:[{
        amount:{
            type:Number,
            required:true,
        },
        time:{
            type:Date,
            default:Date.now
        },
        type:{
            type:String,
            enum:['credit','debit'],
            required:true,
        }
    }]
},{timestamps:true})



module.exports = mongoose.model('Wallet',wallet)