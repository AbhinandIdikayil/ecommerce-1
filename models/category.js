const mongoose = require('mongoose');


const categorySchema = mongoose.Schema({
    categoryname:{
        type:String,
        required:true,
    },
    delete:{
        type:Boolean,
        default:false,
    }
})

module.exports = mongoose.model('Category',categorySchema);