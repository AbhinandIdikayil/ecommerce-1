var express = require('express');
var adminRoute = express.Router();
const adminController = require('../controllers/adminController');
const multer = require('multer');
const isCouponExp = require('../middleware/DBdateCheck')
const auth = require('../middleware/auth')
const isImage = (file) => {
  const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif','image/webp','image/jpg']; // Add more image types if needed
  return allowedImageTypes.includes(file.mimetype);
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => {

      let uploadDir = ''; // Initialize the upload directory
      // const allowedRoutes = ['/add-product', '/edit/product', '/edit-category','/add-banner'];
      const allowedProductRoutes = ['/add-product', '/edit/product'];
      const allowedBannerRoutes = ['/banner/add-banner', '/edit-banner'];

      // Determine the upload directory based on the route path
      if (allowedProductRoutes.some(route => req.route.path.includes(route))) {
        uploadDir = 'public/images/product';
      } else if (allowedBannerRoutes .some(route => req.route.path.includes(route))) {
        uploadDir = 'public/images/banner';
      } else {
        cb(new Error('Invalid route for file upload.'));
        return;
      }

      if(isImage(file)){
        console.log(file.mimetype)
        cb(null, uploadDir); // Set the destination folder for uploaded images
      }else{
        cb(new Error('Invalid file type. Only image files are allowed.'));
      }
      
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() + '-' + file.originalname); // Set the file name to be unique
    },
  });


  const fileFilter = (req, file, cb) => {
    if (isImage(file)) {
      cb(null, true); // Allow the file to be uploaded
    } else {
      // res.json({message:'Invalid file type. Only imge files are allowed'})
      cb(new Error('Invalid file type. Only image files are allowed.'), false);
    }
  };
  
let upload = multer({ 
  storage : storage ,
  fileFilter : fileFilter,
 });



adminRoute.get('/',   auth.requireAuth2,    adminController.getLogin);


adminRoute.get("/error",adminController.getError)
adminRoute.get('/home',   auth.requireAuth,   adminController.loadhome2);


adminRoute.post('/',adminController.postLogin);
adminRoute.post('/home/signout',adminController.signout)
adminRoute.get('/downloadSalesReport',adminController.downloadSalesReport);

adminRoute.get('/page-products-list',adminController.getProducts);
adminRoute.get('/user-list',adminController.showUsers);

//  for adding the products, here is no get route becuase when user click add product button it will d
//  display:none the product list page  and display:flex the  form of add product
adminRoute.post('/add-product',upload.array('images',4),adminController.postAddProduct);
// for editing the product
adminRoute.get('/edit-product/:id',adminController.getEditProduct);

adminRoute.post('/delete-image/:image/:proId',adminController.deleteImages);

adminRoute.post('/edit/product/:id',upload.array('images',4),adminController.postEditProduct);
adminRoute.delete('/delete-product/:id',adminController.deleteProduct);



// to block and unblock users
adminRoute.post('/block-user/:id',adminController.blockUser);
adminRoute.post('/unblock-user/:id',adminController.unblockUser);


// for adding,edit  and deleting  the category
adminRoute.get('/category',adminController.showCategory);
adminRoute.route('/edit-category/:id')
          .get(adminController.getEditCategory) 
          .put(adminController.postEditCategory);

adminRoute.put('/add-category',adminController.addCategory);
adminRoute.get('/unlist-category',adminController.getUnlistCategory);
adminRoute.get('/unlist-category/:id',adminController.updateUnlistCategory)

adminRoute.get('/delete-category/:id',adminController.deleteCategory);
// for editing the categories 

// adminRoute.post('/edit-category/:id',adminController.postEditCategory); 

// for unlisting (restoring) the deleted products
adminRoute.get('/unlist-product',adminController.getUnlistProduct);
adminRoute.get('/unlist-product/:id',adminController.postUnlistProduct);

// for order listing and order details
adminRoute.get('/order-list',adminController.getOrders);
adminRoute.get('/order/edit/:id',adminController.editOrder);
adminRoute.post('/order/edit-order-status/:id',adminController.postEditOrder)

// for coupen management
adminRoute.get('/coupon',isCouponExp.isExpired,adminController.getCoupon)
adminRoute.get('/add-coupon',isCouponExp.isExpired,adminController.getAddCoupon)
adminRoute.post('/add/coupon',adminController.postAddCoupon);
adminRoute.post('/coupon/delete/:id',adminController.deleteCoupon)
// for banner section
adminRoute.get('/banner',adminController.banner);
adminRoute.get('/banner/get-add-banner',adminController.getAddBanner);
adminRoute.post('/banner/add-banner',upload.single('image'),adminController.postAddBanner);
// for refferal section
adminRoute.get('/refferal',adminController.getRefferal);
adminRoute.get('/get-add-reffer',adminController.getRefferalForm)
adminRoute.post('/add/reffer',adminController.postReffer);

// for offer section
adminRoute.get('/offer',adminController.getOffer)
adminRoute.route('/add-category-offer')
          .get(adminController.getOfferForm)
          .post(adminController.postOfferForm);
adminRoute.delete('/unlist-offer/:offerId',adminController.unlistOffer)
adminRoute.delete('/list-offer/:offerId',adminController.listOffer)
module.exports = adminRoute;