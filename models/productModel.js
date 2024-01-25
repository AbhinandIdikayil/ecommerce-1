const mongoose = require('mongoose');
const Schema = mongoose.Schema

const productSchema = new Schema({
    productname:{
        type:String,
        required:true,
    },
    category:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Category',
    },
    description:{
        type:String,
        required:true,
    },
    section:{
        type:String,
        required:true,
    },
    price:{
        type:Number,
        required:true,
    },
    stock:{
        type:Number,
        required:true,
    },
    images:{
        type:[String],
        required:true
    },
    offer:{
        type:Number,
        default:0,
    },
    originalprice:{
        type:Number,
    },
    delete:{
        type:Boolean,
        default:false,
    },
    createdOn: { type: Date, default: Date.now },
})



module.exports = mongoose.model('product',productSchema);