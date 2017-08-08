module.exports = function(oidc, iss){
    var express = require('express')
    var router = express.Router()

    //redirect to login
    router.get('/', oidc.check(), oidc.use({models: 'user'}), function(req, res) {
        req.model.user.findOne({id: req.session.user}, function(err, user) {
            if(err || !user){
                console.log('ERROR')
                console.log(err)
                console.log(user)
                req.message(err)
                res.redirect('/login')
            }
            else {
                res.render('pages/profile.ejs', {
                    'me':user,
                    'connect':{
                        iss:(iss||req.headers.host),
                        sub:req.session.me.email,
                        proxy:'rethink-oidc',
                        name:req.session.me.email,
                        picture:'http://placehold.it/300x300'
                    },
                    'message':req.message
                })
            }
        })
    });


// =============================================================================
// AUTHENTICATE ================================================================
// =============================================================================

    //Login form (I use email as user name)
    router.get('/login', function(req, res, next) {
        res.render('pages/login.ejs', {
            'message':req.message
        })
    });

    var validateUser = function (req, next) {
      delete req.session.error;
      req.model.user.findOne({email: req.body.email}, function(err, user) {
          if(err || !user){
            console.log('User not found')
            var error = new Error('User not found')
            return next(error)
          }
          else if(!user.samePassword(req.body.password)) {
            console.log(user+" "+req.body.password+"=?"+user.password)
            var error = new Error('Username or password incorrect.');
            return next(error);
          } else {
            return next(null, user);
          }
      });
    };

    var afterLogin = function (req, res, next) {
        req.model.user.findOne({id: req.session.user}, function(err, user) {
            if(err){
                res.redirect('/login')
                }
            else {
                req.session.me = {username: user.given_name, email: user.email}
                res.redirect(req.query.redirect_uri||req.query.return_url||'/');
            }
        })
    };

    var loginError = function (err, req, res, next) {
        req.session.error = err.message;
        res.redirect(req.path);
    };

    router.post('/login', oidc.login(validateUser), afterLogin, loginError);

    var logoutError = function (err, req, res, next){
        req.flash('signupError', err);
        console.log(err)
        req.session.destroy();
        res.redirect('/login')
    }


// SBE Patch to logout
    router.get('/logout', function(req, res, next) { // oidc.removetokens(), function(req, res, next) {
        req.session.destroy();
        res.redirect('/login');
    }, logoutError);

// =============================================================================
// SIGNUP ======================================================================
// =============================================================================
    router.get('/signup', function(req, res, next) {
        var message = req.flash('signupError')
        res.render('pages/signup.ejs', {
            'message':message
        })
        console.log(message)
    }, logoutError);

    //process user creation
    router.post('/signup', oidc.use({policies: {loggedIn: false}, models: 'user'}), function(req, res, next) {
      delete req.session.error;
      req.model.user.findOne({email: req.body.email}, function(err, user) {
          if(err) {
              req.flash('signupError', err);
          } else if(user) {
              req.flash('signupError', 'User already exists.');
          }
          if(req.session.error) {
              res.redirect(req.path);
          } else {
              req.body.name = req.body.given_name+' '+(req.body.middle_name?req.body.middle_name+' ':'')+req.body.family_name;
              try {
                req.body.birthdate = new Date(Date.parse(req.body.dob_year+'-'+req.body.dob_month+'-'+req.body.dob_day)).toISOString()
              }
              catch (_error)
              {
                req.body.birthdate =  new Date("1900-01-01").toISOString();
              }

              console.log(req.body)

              req.model.user.create(req.body, function(err, user) {
                 if(err || !user) {
                     req.flash('signupError', err?err:'User could not be created.');
                     res.redirect(req.path);
                 } else {
                     console.log(user)
                     req.session.user = user.id;
                     next();
                 }
              });
          }
      });
    }, afterLogin);


    return router
}
