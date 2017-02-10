module.exports = function(oidc, iss){
    var express = require('express')
    var router = express.Router()

    //redirect to login
    router.get('/', oidc.check(), oidc.use({models: 'user'}), function(req, res) {
        res.render('pages/profile.ejs', {
            'me':req.session.me,
            'connect':{
                'iss':(iss||req.headers.host),
                'sub':req.session.me.email,
                'type':'rethink-oidc',
                'name':req.session.me.email
            },
            'message':req.message
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
          if(!err && user && user.samePassword(req.body.password)) {
            console.log(user+" "+req.body.password+"=?"+user.password)
            return next(null, user);
          } else {
            var error = new Error('Username or password incorrect.');
            return next(error);
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



    router.get('/logout', oidc.removetokens(), function(req, res, next) {
        req.session.destroy();
        res.redirect('/login');
    }, logoutError);

// =============================================================================
// SIGNUP ======================================================================
// =============================================================================
    router.get('/signup', function(req, res, next) {
        //req.session.destroy();
        res.render('pages/signup.ejs', {
            'message':req.flash('signupError')
        })
    }, logoutError);

    //process user creation
    router.post('/create', oidc.use({policies: {loggedIn: false}, models: 'user'}), function(req, res, next) {
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
              req.model.user.create(req.body, function(err, user) {
                 if(err || !user) {
                     req.flash('signupError', err?err:'User could not be created.');
                     res.redirect(req.path);
                 } else {
                     req.session.user = user.id;
                     res.redirect('/user');
                 }
              });
          }
      });
    });


    return router
}