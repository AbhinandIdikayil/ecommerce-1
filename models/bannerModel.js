const mongoose = require('mongoose');

const bannerSchema = mongoose.Schema({
    bannerTitle:{
        type:String,
        required:true
    },
    startDate:{
        type:Date,
        required:true
    },
    endDate:{
        type:Date,
        required:true
    },
    productRoute:{
        type:String,
        required:true,
    },
    image:{
        type:String,
        required:true
    }
})

module.exports = mongoose.model('Banner',bannerSchema);