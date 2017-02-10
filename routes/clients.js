module.exports = function(oidc){
    var express = require('express'),
        router = express.Router(),
        crypto = require('crypto')

    //Client list
    router.get('/', oidc.use(['client', 'consent']), function(req, res, next){
        var userClients = {
            authedClients: [],
            ownedClients: [],
        }
        req.model.client.find({owner: req.session.user}, function(err, clients){
            clients.forEach(function(client) {
                userClients.ownedClients.push({name: client.name, id: client.id})
            });
            req.model.consent.find({user: req.session.user}, function(err, consents){
                consents.forEach(function(consent){
                    req.model.client.find({id: consent.client}, function(err, clients){
                        clients.forEach(function(client) {
                            userClients.authedClients.push({name: client.name, id: client.id})
                        })
                        res.render('pages/clients.ejs',{
                            'clients': userClients,
                            'me':req.session.me
                        })
                    })
                })
            })
        })
    });

    //Client by ID
    // TODO Display flash message on redirect
    router.get('/:id', oidc.use('client'), function(req, res, next){
        req.model.client.findOne({id: req.params.id}, function(err, client){
            if(err) {
                next(err);
            } else if(client) {
                res.render('pages/client.ejs',{
                    'client': client,
                    'me': req.session.me
                })
            } else {
                req.flash('clientError', 'Client '+req.params.id+' not found.');
                res.redirect('/clients')
          }
      });
    });

    //Client register form
    // TODO oidc.use('client')??
    router.get('/register', oidc.use('client'), function(req, res, next) {
        res.render('pages/register_client',{'me': req.session.me})
    });

    //process client register
    router.post('/register', oidc.use('client'), function(req, res, next) {
        delete req.session.error;
        req.body.required_sig = req.body.required_sig;
        req.body.owner = req.session.user;
        req.body.redirect_uris = req.body.redirect_uris.split(/[, ]+/);
        req.body.key = "a"
        req.body.secret = "a"
      req.model.client.create(req.body, function(err, client){
        if(!err && client) {
          res.redirect('/client/'+client.id);
        } else {
          next(err);
        }
      });
    });

    return router
}