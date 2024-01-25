let couponModel = require('../models/coupon');


exports.isExpired = async (req,res,next) => {
    try {
        let currentDate = Date.now()
        let coupon = await couponModel.updateMany
        ({expiryDate : {$lt : currentDate}},
        {$set:{isExpired:true}},
        {new:true})
        next();
    } catch (error) {
        console.log(error)
    }
}