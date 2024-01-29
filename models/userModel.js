const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
    firstname: String,
    lastname:String,
    email: String,
    phone: String,
    gender: String,
    password: String,
    address: [String],
    wishlist: [String],
    cart: {
        type:mongoose.Schema.Types.ObjectId,
        ref:'product',
    },
    refercode:{
        type:String,
        required:true,
    },
    refercount:{
        type:Number,
        required:true,
        default:0
    },  
    blocked:{
        type:Boolean,
        default:false,
    },
    createdOn: { type: Date, default: Date.now },
})

module.exports = mongoose.model('User',userSchema)