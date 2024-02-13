const express = require('express');
const userRoute = express.Router();
const userController = require('../controllers/userController');
const cartController = require('../controllers/cartController');
const addressController = require('../controllers/addressController');
const orderDetailsController = require('../controllers/orderDetailsController');
const filterpageController = require('../controllers/filterpageController');
const auth = require('../middleware/auth')

userRoute.get('/',(req,res) => {
    res.redirect('/home')
})

userRoute.use(auth.isBlocked);

userRoute.get('/home',userController.loadHome);

// for login and signout (get and post)
userRoute.get('/login',     auth.notSignInOrLogin     ,userController.loadLogin);
userRoute.post('/login',userController.postLogin);

userRoute.get('/signup' , auth.notSignInOrLogin   , userController.getSignup);
userRoute.post('/signup',userController.postSignup);

userRoute.get('/home/wishlist',     auth.isSignInOrLogin    ,userController.getWishlist);
userRoute.get('/home/bag',      auth.isSignInOrLogin  ,cartController.getBag)




userRoute.post('/forgot-password',userController.postForgotPassword);
userRoute.post('/post-otp',userController.postForgotPasswordOTP);
userRoute.post('/new-password',userController.postNewPassword);
// posting the otp
userRoute.post('/otp',userController.postOTP);
userRoute.post('/resend-otp',userController.resendOTP)
userRoute.get('/home/products/:section',auth.isBlocked,filterpageController.getSectionBasedProductList);
userRoute.get('/home/products/:section/:categoryId',filterpageController.filteredCategoryPage);

userRoute.get('/home/signout',userController.Signout);

userRoute.get('/order/success-page',userController.successPage)
userRoute.post('/home/cart/check-out/coupon',userController.coupon)
userRoute.post('/verify-wallet-payment',userController.verifyWalletPayment);
// get req for wishlist,cart(bag),checkout and (post and delete) req for deleting a product from cart
// add to cart,increasing quanity of product from cart,address selecting from paymnet page and lastly proceed to payment
userRoute.get('/home/cart/check-out',userController.loadCheckOut);
userRoute.post('/home/cart/check-out/:id',userController.proceedToPayment);
userRoute.post('/verify-payment',userController.onlinePayment)

userRoute.delete('/home/cart-delete/:id',cartController.deleteCart)
userRoute.post('/home/add-to-cart/:id',cartController.addToBag);
// these routes are for  making an order like checkout page, proceed to payment
userRoute.post('/home/cart/quantity/:id',cartController.updateCartQuantityAndStock);
// selecting a specific address through a popup or modal
userRoute.post('/home/cart/add-address/:id',userController.modalAddressSelecting);

// adding a address in checkout page by a modal
userRoute.post('/home/cart/check-out/add-address/:id',userController.postAddressFromCheckOut)


userRoute.get("/home/account",      auth.isSignInOrLogin    ,   userController.accounDetails);
userRoute.get('/home/account/reffer',     auth.isSignInOrLogin      ,userController.getReffer)
// related to account , user details, address and orders
userRoute.get("/home/account/addresses",    auth.isSignInOrLogin    ,addressController.AddressDetails);
userRoute.get('/home/account/edit-address/:id',addressController.getEditAddress);
userRoute.get('/home/account/orders',    auth.isSignInOrLogin    , orderDetailsController.getOrders);
userRoute.get('/home/account/orders/:id',orderDetailsController.getOrderSummary)
userRoute.get('/home/account/wallet',   auth.isSignInOrLogin      ,userController.wallet);
userRoute.post('/home/account/wallet/:id',userController.addMoneyToWallet);

userRoute.post('/home/account/update-info/:id',userController.updateUserInformation);  
userRoute.post('/home/account/add-address/:id',addressController.PostaddAddress);
userRoute.post('/home/account/edit-address/:id',addressController.postEditAddress);
userRoute.delete('/home/account/delete-address/:id',addressController.delelteAddress);
userRoute.post('/home/account/orders/:id/:orderId',orderDetailsController.cancelOrder);
userRoute.post('/home/account/orders/return/:orderId/:orderItemId',orderDetailsController.returnOrder);

userRoute.get('/home/account/order-invoice/:addressId/:orderId/:productId',orderDetailsController.puppeteerInvoice)






userRoute.get('/home/:id',userController.getProducts);
module.exports = userRoute;