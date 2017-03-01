module.exports = function(oidc, iss){
    var express = require('express')
    var router = express.Router()



    router.get('/', oidc.check(), oidc.use({models: 'user'}), function(req, res, next){
        res.render('profile', {
            me:req.session.me,
            params:{
                iss:(iss||req.headers.host),
                sub:req.session.me.email,
                proxy:'rethink-oidc',
                name:req.session.me.email,
                picture:'http://placehold.it/300x300'
            }
        })
    });

    //User Info Endpoint
    router.get('/info', oidc.userInfo());

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

    return router
}