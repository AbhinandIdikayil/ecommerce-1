const mongoose = require('mongoose');

const refferalSchema = mongoose.Schema({
    refferalamount:{
        type:Number,
        required:true,
    },
    refferedamount:{
        type:Number,
        required:true
    },
    description:{
        type:String,
        required:true
    },
    expires:{
        type:Date,
        required:true,
    }
}) 

module.exports = mongoose.model('Refferal',refferalSchema);