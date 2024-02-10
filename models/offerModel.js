const mongoose = require('mongoose');

const offerSchema = mongoose.Schema({
    categoryId:{
        type:mongoose.Types.ObjectId,
        ref:'Category',
        unique:true,
    },
    offer:{
        type:Number,
        required:true,
    },
    delete:{
        type:Boolean,
        default:false
    }
})

module.exports = mongoose.model('Offer',offerSchema);