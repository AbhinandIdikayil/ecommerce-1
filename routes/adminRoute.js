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

adminRoute.post('/home/signout',adminController.signout)
adminRoute.get("/error",adminController.getError)
adminRoute.get('/',auth.isAdminLogged,adminController.getLogin);
adminRoute.post('/',adminController.postLogin);
adminRoute.get('/home',auth.isAdminNotLogged,adminController.loadHome);

adminRoute.get('/page-products-list',auth.isAdminNotLogged,adminController.getProducts);
adminRoute.get('/user-list',auth.isAdminNotLogged,adminController.showUsers);

//  for adding the products, here is no get route becuase when user click add product button it will d
//  display:none the product list page  and display:flex the  form of add product
adminRoute.post('/add-product',upload.array('images',4),adminController.postAddProduct);
// for editing the product
adminRoute.get('/edit-product/:id',auth.isAdminNotLogged,adminController.getEditProduct);

adminRoute.post('/delete-image/:image/:proId',adminController.deleteImages);

adminRoute.post('/edit/product/:id',upload.array('images',4),adminController.postEditProduct);
adminRoute.delete('/delete-product/:id',adminController.deleteProduct);



// to block and unblock users
adminRoute.post('/block-user/:id',adminController.blockUser);
adminRoute.post('/unblock-user/:id',adminController.unblockUser);


// for adding,edit  and deleting  the category
adminRoute.get('/category',auth.isAdminNotLogged,adminController.showCategory);
adminRoute.get('/edit-category/:id',auth.isAdminNotLogged,adminController.getEditCategory);
adminRoute.put('/edit-category/:id',adminController.postEditCategory);

adminRoute.put('/add-category',adminController.addCategory);
adminRoute.get('/unlist-category',auth.isAdminNotLogged,adminController.getUnlistCategory);
adminRoute.get('/unlist-category/:id',auth.isAdminNotLogged,adminController.updateUnlistCategory)

adminRoute.get('/delete-category/:id',auth.isAdminNotLogged,adminController.deleteCategory);
// for editing the categories 

// adminRoute.post('/edit-category/:id',adminController.postEditCategory); 

// for unlisting (restoring) the deleted products
adminRoute.get('/unlist-product',auth.isAdminNotLogged,adminController.getUnlistProduct);
adminRoute.get('/unlist-product/:id',auth.isAdminNotLogged,adminController.postUnlistProduct);

// for order listing and order details
adminRoute.get('/order-list',auth.isAdminNotLogged,adminController.getOrders);
adminRoute.get('/order/edit/:id',auth.isAdminNotLogged,adminController.editOrder);
adminRoute.post('/order/edit-order-status/:id',auth.isAdminNotLogged,adminController.postEditOrder)

// for coupen management
adminRoute.get('/coupon',auth.isAdminNotLogged,isCouponExp.isExpired,adminController.getCoupon)
adminRoute.get('/add-coupon',auth.isAdminNotLogged,isCouponExp.isExpired,adminController.getAddCoupon)
adminRoute.post('/add/coupon',adminController.postAddCoupon);
adminRoute.post('/coupon/delete/:id',adminController.deleteCoupon)
// for banner section
adminRoute.get('/banner',auth.isAdminNotLogged,adminController.banner);
adminRoute.get('/banner/get-add-banner',auth.isAdminNotLogged,adminController.getAddBanner);
adminRoute.post('/banner/add-banner',upload.single('image'),adminController.postAddBanner);
// for refferal section
adminRoute.get('/refferal',auth.isAdminNotLogged,adminController.getRefferal);
adminRoute.get('/get-add-reffer',auth.isAdminNotLogged,adminController.getRefferalForm)
adminRoute.post('/add/reffer',adminController.postReffer)


module.exports = adminRoute;