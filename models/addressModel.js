const mongoose = require('mongoose');

const addressSchema = mongoose.Schema({
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
    },
    firstname:{
        type:String,
        required:true,
    },
    mobile:{
        type:String,
        required:true,
    },
    pincode:{
        type:String,
        required:true,
    },
    address:{
        type:String,
        required:true,
    },
    housename:{
        type:String,
        required:true,
    },
    districtORcity:{
        type:String,
        required:true,
    },
    state:{
        type:String,
        required:true,
    },
    selected:{
        type:Boolean,
        default:false,
    }
})

module.exports = mongoose.model("Address",addressSchema)