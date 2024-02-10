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
        expires:0
    }
},{ capped: { size: 1024, max: 1 } }) 

module.exports = mongoose.model('Refferal',refferalSchema);