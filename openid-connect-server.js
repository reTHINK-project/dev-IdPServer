
/**
 * Module dependencies.
 */

var crypto = require('crypto'),
    express = require('express'),
    expressSession = require('express-session'),
    https = require('https'),
    //http = require('http'),
    fs = require('fs'),
    path = require('path'),
    querystring = require('querystring'),
    rs = require('connect-redis')(expressSession),
    extend = require('extend'),
    test = {
        status: 'new'
    },
    logger = require('morgan'),
    bodyParser = require('body-parser'),
    cookieParser = require('cookie-parser'),
    errorHandler = require('errorhandler'),
    methodOverride = require('method-override'),
    pem2jwk = require('pem-jwk').pem2jwk,
    jwk2pem = require('pem-jwk').jwk2pem,
    jwt = require('jsonwebtoken');

var app = express();

var env = process.env.NODE_ENV || 'development'
//var config = (env == 'development' ? require('./dev_config') : require('./config'));
var config = require('./config');

console.log(config.redis.port)
console.log(config.redis.host)

var httpsOptions = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
}

var options = {
  adapters: {
    redis: {
        defaults: {
            port: config.redis.port,
            host: config.redis.host
        }
    }
  },
  login_url: '/my/login',
  consent_url: '/user/consent',
  scopes: {
    foo: 'Access to foo special resource',
    bar: 'Access to bar special resource'
  },
//when this line is enabled, user email appears in tokens sub field. By default, id is used as sub.
  models:{user:{attributes:{sub:function(){return this.email;}}}},
  app: app
};
var oidc = require('openid-connect').oidc(options);


// all environments
app.set('port', config.node.port);
app.use(logger('dev'));
app.use(bodyParser());
app.use(methodOverride());
app.use(cookieParser('Some Secret!!!'));
app.use(expressSession({store: new rs({host: config.redis.host, port: config.redis.port}), secret: 'Some Secret!!!'}));
// app.use(app.router);

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

//redirect to login
app.get('/', function(req, res) {
  res.redirect('/my/login');
});

//Login form (I use email as user name)
app.get('/my/login', function(req, res, next) {
  var head = '<head><title>Login</title></head>';
  var inputs = '<input type="text" name="email" placeholder="Enter Email"/><input type="password" name="password" placeholder="Enter Password"/>';
  var error = req.session.error?'<div>'+req.session.error+'</div>':'';
  var body = '<body><h1>Login</h1><form method="POST">'+inputs+'<input type="submit"/></form>'+error;
  res.send('<html>'+head+body+'</html>');
});

//Login form (I use email as user name)
app.get('/proxy/login', function(req, res, next) {
  var head = '<head><title>Login</title></head>';
  var inputs = '<input type="text" name="email" placeholder="Enter Email"/><input type="password" name="password" placeholder="Enter Password"/>';
  var error = req.session.error?'<div>'+req.session.error+'</div>':'';
  var body = '<body><h1>Login</h1><form method="POST">'+inputs+'<input type="submit"/></form>'+error;
  res.send('<html>'+head+body+'</html>');
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
    res.redirect(req.param('return_uri')||'/user');
};

var loginError = function (err, req, res, next) {
    req.session.error = err.message;
    res.redirect(req.path);
};

app.post('/my/login', oidc.login(validateUser), afterLogin, loginError);

app.all('/logout', oidc.removetokens(), function(req, res, next) {
    req.session.destroy();
    res.redirect('/my/login');
});

//authorization endpoint
app.get('/user/authorize', oidc.auth());

//token endpoint
app.post('/user/token', oidc.token());

//user consent form
app.get('/user/consent', function(req, res, next) {
  var head = '<head><title>Consent</title></head>';
  var lis = [];
  for(var i in req.session.scopes) {
    lis.push('<li><b>'+i+'</b>: '+req.session.scopes[i].explain+'</li>');
  }
  var ul = '<ul>'+lis.join('')+'</ul>';
  var error = req.session.error?'<div>'+req.session.error+'</div>':'';
  var body = '<body><h1>Consent</h1><form method="POST">'+ul+'<input type="submit" name="accept" value="Accept"/><input type="submit" name="cancel" value="Cancel"/></form>'+error;
  res.send('<html>'+head+body+'</html>');
});

//process user consent form
app.post('/user/consent', oidc.consent());

//user creation form
app.get('/user/create', function(req, res, next) {
  var head = '<head><title>Sign in</title></head>';
  var inputs = '';
  //var fields = mkFields(oidc.model('user').attributes);
  var fields = {
          given_name: {
              label: 'Given Name',
              type: 'text'
          },
          middle_name: {
              label: 'Middle Name',
              type: 'text'
          },
          family_name: {
              label: 'Family Name',
              type: 'text'
          },
          email: {
              label: 'Email',
              type: 'email'
          },
          password: {
              label: 'Password',
              type: 'password'
          },
          passConfirm: {
              label: 'Confirm Password',
              type: 'password'
          }
  };
  for(var i in fields) {
    inputs += '<div><label for="'+i+'">'+fields[i].label+'</label><input type="'+fields[i].type+'" placeholder="'+fields[i].label+'" id="'+i+'"  name="'+i+'"/></div>';
  }
  var error = req.session.error?'<div>'+req.session.error+'</div>':'';
  var body = '<body><h1>Sign in</h1><form method="POST">'+inputs+'<input type="submit"/></form>'+error;
  res.send('<html>'+head+body+'</html>');
});

//process user creation
app.post('/user/create', oidc.use({policies: {loggedIn: false}, models: 'user'}), function(req, res, next) {
  delete req.session.error;
  req.model.user.findOne({email: req.body.email}, function(err, user) {
      if(err) {
          req.session.error=err;
      } else if(user) {
          req.session.error='User already exists.';
      }
      if(req.session.error) {
          res.redirect(req.path);
      } else {
          req.body.name = req.body.given_name+' '+(req.body.middle_name?req.body.middle_name+' ':'')+req.body.family_name;
          req.model.user.create(req.body, function(err, user) {
             if(err || !user) {
                
        console.log("cannot do")
        console.log(err)
        console.log(user)
                 req.session.error=err?err:'User could not be created.';
                 res.redirect(req.path);
             } else {
                 req.session.user = user.id;
                 res.redirect('/user');
             }
          });
      }
  });
});

app.get('/user', oidc.check(), function(req, res, next){
  res.send('<h1>User Page</h1><div><a href="/client">See registered clients of user</a></div>');
});

//User Info Endpoint
app.get('/api/user', oidc.userInfo());

app.get('/user/foo', oidc.check('foo'), function(req, res, next){
  res.send('<h1>Page Restricted by foo scope</h1>');
});

app.get('/user/bar', oidc.check('bar'), function(req, res, next){
  res.send('<h1>Page restricted by bar scope</h1>');
});

app.get('/user/and', oidc.check('bar', 'foo'), function(req, res, next){
  res.send('<h1>Page restricted by "bar and foo" scopes</h1>');
});

app.get('/user/or', oidc.check(/bar|foo/), function(req, res, next){
  res.send('<h1>Page restricted by "bar or foo" scopes</h1>');
});

//Client register form
app.get('/client/register', oidc.use('client'), function(req, res, next) {

  var mkId = function() {
    var key = crypto.createHash('md5').update(req.session.user+'-'+Math.random()).digest('hex');
    req.model.client.findOne({key: key}, function(err, client) {
      if(!err && !client) {
          var secret = crypto.createHash('md5').update(key+req.session.user+Math.random()).digest('hex');
          req.session.register_client = {};
          req.session.register_client.key = key;
          req.session.register_client.secret = secret;
          var head = '<head><title>Register Client</title></head>';
          var inputs = '';
          var fields = {
                name: {
                    label: 'Client Name',
                    html: '<input type="text" id="name" name="name" placeholder="Client Name"/>'
                },
                redirect_uris: {
                    label: 'Redirect Uri',
                    html: '<input type="text" id="redirect_uris" name="redirect_uris" placeholder="Redirect Uri"/>'
                },
                required_sig: {
                    label: 'Signature Algorithm',
                    html: '<select id="required_sig" name="required_sig"> <option value="HS256">HS256</option> <option value="RS256">RS256</option> </select>'
                },
                key: {
                    label: 'Client Key',
                    html: '<span>'+key+'</span>'
                },
                secret: {
                    label: 'Client Secret',
                    html: '<span>'+secret+'</span>'
                }
          };
          for(var i in fields) {
            inputs += '<div><label for="'+i+'">'+fields[i].label+'</label> '+fields[i].html+'</div>';
          }
          var error = req.session.error?'<div>'+req.session.error+'</div>':'';
          var body = '<body><h1>Register Client</h1><form method="POST">'+inputs+'<input type="submit"/></form>'+error;
          res.send('<html>'+head+body+'</html>');
      } else if(!err) {
          mkId();
      } else {
          next(err);
      }
    });
  };
  mkId();
});

//process client register
app.post('/client/register', oidc.use('client'), function(req, res, next) {
    delete req.session.error;
  req.body.required_sig = req.body.required_sig;
  req.body.key = req.session.register_client.key;
  req.body.secret = req.session.register_client.secret;
  req.body.user = req.session.user;
  req.body.redirect_uris = req.body.redirect_uris.split(/[, ]+/);
  req.model.client.create(req.body, function(err, client){
    if(!err && client) {
      res.redirect('/client/'+client.id);
    } else {
      next(err);
    }
  });
});

app.get('/client', oidc.use('client'), function(req, res, next){
  var head ='<h1>Clients Page</h1><div><a href="/client/register"/>Register new client</a></div>';
  req.model.client.find({user: req.session.user}, function(err, clients){
     var body = ["<ul>"];
     clients.forEach(function(client) {
        body.push('<li><a href="/client/'+client.id+'">'+client.name+'</li>');
     });
     body.push('</ul>');
     res.send(head+body.join(''));
  });
});

app.get('/client/:id', oidc.use('client'), function(req, res, next){
  req.model.client.findOne({user: req.session.user, id: req.params.id}, function(err, client){
      if(err) {
          next(err);
      } else if(client) {
          var html = '<h1>Client '+client.name+' Page</h1><div><a href="/client">Go back</a></div><ul><li>Requested signature: '+client.required_sig+'</li><li>Key: '+client.key+'</li><li>Secret: '+client.secret+'</li><li>Redirect Uris: <ul>';
          client.redirect_uris.forEach(function(uri){
             html += '<li>'+uri+'</li>';
          });
          html+='</ul></li></ul>';
          res.send(html);
      } else {
          res.send('<h1>No Client Fount!</h1><div><a href="/client">Go back</a></div>');
      }
  });
});

/* ---------------------------------------------------------------------------------------------- */
/* -------------------------------- PROXY APP --------------------------------------------------- */
/* ---------------------------------------------------------------------------------------------- */

app.get('/.well-known/idp-proxy/rethink-oidc', function(req, res, next){

//    console.log(req.params.sid)
//    fs = require('fs')
//    fs.readFile(path.join(__dirname + '/public/javascripts/rethink-oidc.js'), 'utf8', function (err,data) {
//      if (err)
//        res.status(500).send('Failed to init IdP Proxy')
//      res.send("var sid='"+req.params.sid+"'\n"+data)
//    })

    res.sendFile(path.join(__dirname + '/public/javascripts/rethink-oidc.js'))
});

//authorization endpoint
app.get('/proxy/authorize', oidc.auth());

app.get('/proxy/done', oidc.check(), function(req, res, next){
       res.send("{}")
//    res.send("<script>"+
//        "var jsonString = {};"+
//        "var data = window.location.hash.substring(1).split('&').toString().split(/[=,]+/);"+
//        "for(var i=0; i<data.length; i+=2){jsonString[data[i]]=data[i+1];}"+
//        "var msg = JSON.stringify(jsonString);"+
//        //Unsecure send to all
//        "window.opener.postMessage(msg,\"*\");"+
//        "window.close();"+
//        "</script>");
});



app.get('/proxy/key', oidc.use({policies: {loggedIn: false}, models: 'client'}), function(req, res, next) {
  req.model.client.find({name: "rethink-oidc"}, function(err, client){
    if (!err && client) {
//        console.log("--------------------SIGNATURE--------------------------")
//        var idToken = jwt.sign({'foo': 'bar', iat: 1455095604}, new Buffer(client[0].secret, 'base64'),
//            {'algorithm': 'RS256',
//            //expiresIn: 3600,
//            //audience: prev.client.key,
//            //issuer: req.protocol+'://'+req.headers.host,
//            //subject: prev.sub||prev.user||null,
//            })
//        console.log(idToken)
//        console.log("--------------------VERIFIED--------------------------")
//        var verified = jwt.verify(idToken, new Buffer(client[0].key, 'base64'))
//        console.log(verified)
//        console.log("--------------------PEMED Key --------------------------")
//        console.log(jwk2pem(pem2jwk(new Buffer(client[0].key, 'base64'))))
//        console.log("--------------------JWKED Key --------------------------")
//        console.log(pem2jwk(new Buffer(client[0].key, 'base64')))
//        console.log(pem2jwk(new Buffer(client[0].secret, 'base64')))
//        console.log("--------------------B64ED Key --------------------------")
//        console.log(new Buffer(client[0].key, 'base64').toString())
        var jwk = pem2jwk(new Buffer(client[0].key, 'base64'))
        res.send(JSON.stringify(jwk))
    } else {
        next(err)
    }
  });
});
app.get('/proxy/id', oidc.use({policies: {loggedIn: false}, models: 'client'}), function(req, res, next) {
  req.model.client.find({name: "rethink-oidc"}, function(err, client){
    if (!err && client) {
        var json = {}
        json.key = client[0].key
        res.send(json)
    } else {
        next(err)
    }
  });
});

app.get('/proxy/verify/', function(req, res, next){
    // sign with default (HMAC SHA256)
    var jwt = require('jsonwebtoken');
    var token = req.query.id_token;
    var cert = new Buffer(req.query.key, 'base64').toString('binary')
    
    jwt.verify(token, cert, { algorithms: ['RS256'] }, function(err, decoded) {
      res.json({
        error: err,
        id_token: decoded
      });
    });
});

app.get('/proxy/test', function(req, res, next){
    res.sendFile(path.join(__dirname + '/IdPProxy_test.html'));
});


app.get('/test/clear', function(req, res, next){
    test = {status: 'new'};
    res.redirect('/test');
});

app.get('/test', oidc.use({policies: {loggedIn: false}, models: 'client'}), function(req, res, next) {
    var html='<h1>Test Auth Flows</h1>';
    var resOps = {
            "/user/foo": "Restricted by foo scope",
            "/user/bar": "Restricted by bar scope",
            "/user/and": "Restricted by 'bar and foo' scopes",
            "/user/or": "Restricted by 'bar or foo' scopes",
            "/api/user": "User Info Endpoint"
    };
    var mkinputs = function(name, desc, type, value, options) {
        var inp = '';
        switch(type) {
        case 'select':
            inp = '<select id="'+name+'" name="'+name+'">';
            for(var i in options) {
                inp += '<option value="'+i+'"'+(value&&value==i?' selected':'')+'>'+options[i]+'</option>';
            }
            inp += '</select>';
            inp = '<div><label for="'+name+'">'+(desc||name)+'</label>'+inp+'</div>';
            break;
        default:
            if(options) {
                for(var i in options) {
                    inp +=  '<div>'+
                                '<label for="'+name+'_'+i+'">'+options[i]+'</label>'+
                                '<input id="'+name+'_'+i+' name="'+name+'" type="'+(type||'radio')+'" value="'+i+'"'+(value&&value==i?' checked':'')+'>'+
                            '</div>';
                }
            } else {
                inp = '<input type="'+(type||'text')+'" id="'+name+'"  name="'+name+'" value="'+(value||'')+'">';
                if(type!='hidden') {
                    inp = '<div><label for="'+name+'">'+(desc||name)+'</label>'+inp+'</div>';
                }
            }
        }
        return inp;
    };
    switch(test.status) {
    case "new":
        req.model.client.find().populate('user').exec(function(err, clients){
            var inputs = [];
            inputs.push(mkinputs('response_type', 'Auth Flow', 'select', null, {code: 'Auth Code', "id_token token": 'Implicit'}));
            var options = {};
            clients.forEach(function(client){
                options[client.key+':'+client.secret]=client.user.id+' '+client.user.email+' '+client.key+' ('+client.redirect_uris.join(', ')+')';
            });
            inputs.push(mkinputs('client_id', 'Client Key', 'select', null, options));
            //inputs.push(mkinputs('secret', 'Client Secret', 'text'));
            inputs.push(mkinputs('scope', 'Scopes', 'text'));
            inputs.push(mkinputs('nonce', 'Nonce', 'text', 'N-'+Math.random()));
            test.status='1';
            res.send(html+'<form method="GET">'+inputs.join('')+'<input type="submit"/></form>');
        });
        break;
    case '1':
        req.query.redirect_uri=req.protocol+'://'+req.headers.host+req.path;
        extend(test, req.query);
        req.query.client_id = req.query.client_id.split(':')[0];
        test.status = '2';
        res.redirect('/user/authorize?'+querystring.stringify(req.query));
        break;
    case '2':
        extend(test, req.query);
        if(test.response_type == 'code') {
            test.status = '3';
            var inputs = [];
            //var c = test.client_id.split(':');
            inputs.push(mkinputs('code', 'Code', 'text', req.query.code));
            /*inputs.push(mkinputs('grant_type', null, 'hidden', 'authorization_code'));
            inputs.push(mkinputs('client_id', null, 'hidden', c[0]));
            inputs.push(mkinputs('client_secret', null, 'hidden', c[1]));
            inputs.push(mkinputs('redirect_uri', null, 'hidden', test.redirect_uri));*/
            res.send(html+'<form method="GET">'+inputs.join('')+'<input type="submit" value="Get Token"/></form>');
        } else {
            test.status = '4';
            html += "Got: <div id='data'></div>";
            var inputs = [];
            //var c = test.client_id.split(':');
            inputs.push(mkinputs('access_token', 'Access Token', 'text'));
            inputs.push(mkinputs('page', 'Resource to access', 'select', null, resOps));

            var after =
                "<script>" +
                    "document.getElementById('data').innerHTML = window.location.hash; " +
                    "var h = window.location.hash.split('&'); " +
                    "for(var i = 0; i < h.length; i++) { " +
                        "var p = h[i].split('='); " +
                        "if(p[0]=='access_token') { " +
                            "document.getElementById('access_token').value = p[1]; " +
                            "break; " +
                        "} " +
                    "}" +
                "</script>";
            /*inputs.push(mkinputs('grant_type', null, 'hidden', 'authorization_code'));
            inputs.push(mkinputs('client_id', null, 'hidden', c[0]));
            inputs.push(mkinputs('client_secret', null, 'hidden', c[1]));
            inputs.push(mkinputs('redirect_uri', null, 'hidden', test.redirect_uri));*/
            res.send(html+'<form method="GET">'+inputs.join('')+'<input type="submit" value="Get Resource"/></form>'+after);
        }
        break;
    case '3':
        test.status = '4';
        test.code = req.query.code;
        var query = {
                grant_type: 'authorization_code',
                code: test.code,
                redirect_uri: test.redirect_uri
        };
        var post_data = querystring.stringify(query);
        var post_options = {
            port: app.get('port'),
            path: '/user/token',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': post_data.length,
                'Authorization': 'Basic '+Buffer(test.client_id, 'utf8').toString('base64'),
                'Cookie': req.headers.cookie
            }
        };

        // Set up the request
        var post_req = https.request(post_options, function(pres) {
            pres.setEncoding('utf8');
            var data = '';
            pres.on('data', function (chunk) {
                data += chunk;
                console.log('Response: ' + chunk);
            });
            pres.on('end', function(){
                console.log(data);
                try {
                    data = JSON.parse(data);
                    html += "Got: <pre>"+JSON.stringify(data)+"</pre>";
                    var inputs = [];
                    //var c = test.client_id.split(':');
                    inputs.push(mkinputs('access_token', 'Access Token', 'text', data.access_token));
                    inputs.push(mkinputs('page', 'Resource to access', 'select', null, resOps));
                    /*inputs.push(mkinputs('grant_type', null, 'hidden', 'authorization_code'));
                    inputs.push(mkinputs('client_id', null, 'hidden', c[0]));
                    inputs.push(mkinputs('client_secret', null, 'hidden', c[1]));
                    inputs.push(mkinputs('redirect_uri', null, 'hidden', test.redirect_uri));*/
                    res.send(html+'<form method="GET">'+inputs.join('')+'<input type="submit" value="Get Resource"/></form>');
                } catch(e) {
                    res.send('<div>'+data+'</div>');
                }
            });
        });

        // post the data
        post_req.write(post_data);
        post_req.end();
        break;
//res.redirect('/user/token?'+querystring.stringify(query));
    case '4':
        test = {status: 'new'};
        res.redirect(req.query.page+'?access_token='+req.query.access_token);
    }
});



// development only
if ('development' == app.get('env')) {
  app.use(errorHandler());
}

function mkFields(params) {
  var fields={};
  for(var i in params) {
    if(params[i].html) {
      fields[i] = {};
      fields[i].label = params[i].label||(i.charAt(0).toUpperCase()+i.slice(1)).replace(/_/g, ' ');
      switch(params[i].html) {
    case 'password':
      fields[i].html = '<input class="form-control" type="password" id="'+i+'" name="'+i+'" placeholder="'+fields[i].label+'"'+(params[i].mandatory?' required':'')+'/>';
      break;
    case 'date':
      fields[i].html = '<input class="form-control" type="date" id="'+i+'" name="'+i+'"'+(params[i].mandatory?' required':'')+'/>';
      break;
    case 'hidden':
      fields[i].html = '<input class="form-control" type="hidden" id="'+i+'" name="'+i+'"/>';
      fields[i].label = false;
      break;
    case 'fixed':
      fields[i].html = '<span class="form-control">'+params[i].value+'</span>';
      break;
    case 'radio':
      fields[i].html = '';
      for(var j=0; j<params[i].ops; j++) {
        fields[i].html += '<input class="form-control" type="radio" id="'+i+'_'+j+'" name="'+i+'" '+(params[i].mandatory?' required':'')+'/> '+params[i].ops[j];
      }
    break;
    default:
      fields[i].html = '<input class="form-control" type="text" id="'+i+'" name="'+i+'" placeholder="'+fields[i].label+'"'+(params[i].mandatory?' required':'')+'/>';
      break;
      }
    }
  }
  return fields;
}

 var clearErrors = function(req, res, next) {
   delete req.session.error;
   next();
 };

var server = https.Server(httpsOptions, app)
//var server = http.createServer(app)

server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
