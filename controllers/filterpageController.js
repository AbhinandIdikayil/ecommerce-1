const productModel = require('../models/productModel');
const categoryModel = require('../models/category');
const userModel = require('../models/userModel')
const mongoose = require('mongoose');

exports.getSectionBasedProductList = async (req,res,next) => {
    try {
      let userDetails = await userModel.findOne({email:req.session.email})
      let category = await categoryModel.find({delete:false});
  
      let menOrWomen = req.params.section
      // You can adjust the page size as needed(here page size means the number of products cart)
      const pageSize = 6;
      let querySearch = req.query.page || 1
      const pageNumber = parseInt(querySearch) || 1; // The page number you want to retrieve
      let searchQuery = req.query.search || ''
      let categoryQuery = undefined
      if(req.query.categoryId){
        categoryQuery = req.query.categoryId
      }
      
      let minPriceQuery,maxPriceQuery;
      if(req.query.min && req.query.max){
       minPriceQuery = parseInt(req.query.min)
       maxPriceQuery =  parseInt(req.query.max)
      }else{
        minPriceQuery = 0
        maxPriceQuery = Number.MAX_SAFE_INTEGER;
      }

      const aggregateQuery = [
        {
          $match: {
            price: { $gte: minPriceQuery, $lte: maxPriceQuery },
            $and:[
              {section: { $regex: new RegExp('^' + menOrWomen, 'i') }, },
              {delete:false},
              { category:categoryQuery ?? {$exists:true},}
            ],
            $or:[
              {productname:{ $regex: new RegExp(searchQuery, 'i')}},
            ]
          },
        },
        {
        $facet: {
          data: [
            { $skip: (pageNumber - 1) * pageSize },
            { $limit: pageSize },
            { $lookup: { from: categoryModel.collection.name, localField: 'category', foreignField: '_id', as: 'categoryDetails' } },
            { $unwind: '$categoryDetails' },
            { $project: { categoryDetails: 1, productname: 1,price:1,offer:1,images:1 /* Add other fields you need */ } },
          ],
          count: [
            { $count: 'total' },
          ],
        },
        },
      ];

    
    const results = await productModel.aggregate(aggregateQuery).exec();
    console.log(results[0].count[0])
    const paginatedData = results[0].data;
    const totalCount = results[0].count.length > 0 ? results[0].count[0].total : 0;
    const pages =totalCount/pageSize

 

    res.render('user/menHome.ejs',{
        Products:paginatedData,
        user:userDetails,
        category:category,
        pages,
        menOrWomen,
        req,
    });
    } catch (error) {
      console.log(error)
      const customError = new Error('Somthing went wrong');
      customError.status = 500; // Set the desired status code
      customError.data = { additionalInfo: 'Additional information about the error' };
      next(customError);
    }
    
}


exports.filteredCategoryPage = async (req,res,next) => {
    try {
      let section = req.params.section;
      let id = req.params.categoryId;
      console.log(req.query.id)
      let searchQuery = req.query.search;
      const pageSize = 6;
      let querySearch = req.query.page || 1
      const pageNumber = parseInt(querySearch) || 1; 
  
      let minPriceQuery,maxPriceQuery;
      if(req.query.min && req.query.max){
       minPriceQuery = parseInt(req.query.min)
       maxPriceQuery =  parseInt(req.query.max)
      }else{
        minPriceQuery = 0
        maxPriceQuery = Number.MAX_SAFE_INTEGER;
      }
  
      let category = await categoryModel.find({delete:false});
      let paramCategory = await categoryModel.findById(id)
      let userDetails = await userModel.findOne({email:req.session.email});
      let Products = await productModel.aggregate([
        {
          $match:{  
            section:{$regex:new RegExp('^' + section, 'i') },
            category:new mongoose.Types.ObjectId(id),
            price:{$gte:minPriceQuery,$lte:maxPriceQuery},
            $or:[
              {productname:{ $regex:  new RegExp(searchQuery , 'i') }  },
            ]
          },
          
        },
        {
          $facet: {
            data: [
              { $skip: (pageNumber - 1) * pageSize },
              { $limit: pageSize },
              { $project: { categoryDetails: 1, productname: 1,price:1,offer:1,images:1 /* Add other fields you need */ } },
            ],
            count: [
              { $count: 'total' },
            ],
          },
        },
      ])
  
      const paginatedData = Products[0].data;
      const totalCount = Products[0].count.length > 0 ? Products[0].count[0].total : 0;
      const pages =totalCount/pageSize
  
      res.render('user/filterCategoryPage',{user:userDetails,
        Products:Products[0].data, 
        category,
        menOrWomen:section,
        pages,
        id,
        paramCategory,
        minPriceQuery,
        maxPriceQuery
      })
    } catch (error) {
      console.log(error)
      const customError = new Error('Somthing went wrong');
      customError.status = 500; // Set the desired status code
      customError.data = { additionalInfo: 'Additional information about the error' };
      next(customError);
    }
  }