const express = require('express');
const userRoute = express.Router();
const userController = require('../controllers/userController');

const auth = require('../middleware/auth')

userRoute.get('/',(req,res) => {
    res.redirect('/home')
})

userRoute.get('/invoice',userController.puppeteerInvoice)

userRoute.get('/home',auth.isBlocked,userController.loadHome);

// for login and signout (get and post)
userRoute.get('/login', auth.notSignInOrLogin ,userController.loadLogin);
userRoute.post('/login',userController.postLogin);
userRoute.get('/signup',auth.notSignInOrLogin,userController.getSignup);
userRoute.post('/signup',auth.notSignInOrLogin,userController.postSignup);
userRoute.get('/home/wishlist',auth.isSignInOrLogin,auth.isSignInOrLogin);
userRoute.get('/home/bag',auth.isSignInOrLogin,userController.getBag)

userRoute.get('/order/success-page',userController.successPage)


userRoute.post('/forgot-password',userController.postForgotPassword);
userRoute.post('/post-otp',userController.postForgotPasswordOTP);
userRoute.post('/new-password',userController.postNewPassword);
// posting the otp
userRoute.post('/otp',userController.postOTP);
userRoute.post('/resend-otp',userController.resendOTP)
userRoute.get('/home/products/:section',auth.isBlocked,userController.getSectionBasedProductList);
userRoute.get('/home/products/:section/:categoryId',userController.filteredCategoryPage)
userRoute.get('/home/signout',userController.Signout);


userRoute.post('/home/cart/check-out/coupon',userController.coupon)
userRoute.post('/verify-wallet-payment',userController.verifyWalletPayment);
// get req for wishlist,cart(bag),checkout and (post and delete) req for deleting a product from cart
// add to cart,increasing quanity of product from cart,address selecting from paymnet page and lastly proceed to payment
userRoute.get('/home/cart/check-out',auth.isSignInOrLogin,userController.loadCheckOut);
userRoute.post('/home/cart/check-out/:id',userController.proceedToPayment);
userRoute.post('/verify-payment',userController.onlinePayment)

userRoute.delete('/home/cart-delete/:id',userController.deleteCart)
userRoute.post('/home/add-to-cart/:id',auth.isSignInOrLogin,userController.addToBag);
// these routes are for  making an order like checkout page, proceed to payment
userRoute.post('/home/cart/quantity/:id',userController.updateCartQuantityAndStock);
// selecting a specific address through a popup or modal
userRoute.post('/home/cart/add-address/:id',userController.modalAddressSelecting);

// adding a address in checkout page by a modal
userRoute.post('/home/cart/check-out/add-address/:id',userController.postAddressFromCheckOut)


userRoute.get("/home/account",auth.isBlocked,userController.accounDetails);
// related to account , user details, address and orders
userRoute.get("/home/account/addresses",userController.AddressDetails);
userRoute.get('/home/account/edit-address/:id',userController.getEditAddress);
userRoute.get('/home/account/orders',userController.getOrders);
userRoute.get('/home/account/orders/:id',userController.getOrderSummary)
userRoute.get('/home/account/wallet',userController.wallet);
userRoute.post('/home/account/wallet/:id',userController.addMoneyToWallet);

userRoute.post('/home/account/update-info/:id',userController.updateUserInformation);  
userRoute.post('/home/account/add-address/:id',userController.PostaddAddress);
userRoute.post('/home/account/edit-address/:id',userController.postEditAddress);
userRoute.delete('/home/account/delete-address/:id',userController.delelteAddress);
userRoute.post('/home/account/orders/:id/:orderId',userController.cancelOrder)

userRoute.get('/home/account/order-invoice/:addressId/:orderId/:productId',userController.puppeteerInvoice)






// userRoute.get('/home/:id',userController.getProducts);
module.exports = userRoute;