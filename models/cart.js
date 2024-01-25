const  mongoose = require("mongoose");


const cartSchema = mongoose.Schema({
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
        required:true,
    },
    items:[
        {
            product:{
                type:mongoose.Schema.Types.ObjectId,
                ref:'product',
                required:true,
            },
            quantity:{
                type:Number,
                default:1
            },
        },
    ],
})

module.exports = mongoose.model("cart",cartSchema);