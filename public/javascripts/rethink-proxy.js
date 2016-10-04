/**
* IdentityProxy -- NODE OPENID CONNECT Server
*
* Initial specification: D4.1
*
* The IdentityModule is a component managing user Identity. It downloads, instantiates
* and manage Identity Provider Proxy (IdP) for its own user identity or for external
* user identity verification.
*
* The IdP contains methods and parameters to actually access and make request
* to the IdP Server. Alternatively some functionnalities can be done locally.
*
*/
var SOURCEURL   = "https://energyq.idp.rethink.orange-labs.fr",
    AUTHPATH    = "/proxy/authorize",
    VERIFYPATH  = "/proxy/verify",
    DONEPATH    = "/proxy/done",
    KEYPATH     = '/proxy/key',
    IDPATH      = '/proxy/id',
    PROXYTYPE   = 'rethink-oidc',
    IDSCOPE     = 'openid',
    FULLSCOPE   = 'openid webrtc',
    TYPE        = 'id_token token';
  //var TYPE       =   'code';

var idp_addr = {'domain': "energyq.idp.rethink.orange-labs.fr", 'protocol': PROXYTYPE}

if (typeof console == "undefined") {
    this.console = {
        log: function () {},
        warn: function () {}
    };
}

function getProxyKey(){
  return new Promise((resolve, reject) => {
    var xmlhttp = new XMLHttpRequest()
    xmlhttp.onreadystatechange = () => {
      if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
        var res = JSON.parse(xmlhttp.responseText)
        res.error != undefined ? reject(res.error) : resolve(res)
      }
    }
    xmlhttp.open("GET", SOURCEURL+KEYPATH, true)
    xmlhttp.send()
  })
}function getProxyID(){
   return new Promise((resolve, reject) => {
     var xmlhttp = new XMLHttpRequest()
     xmlhttp.onreadystatechange = () => {
       if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
         var res = JSON.parse(xmlhttp.responseText)
         res.error != undefined ? reject(res.error) : resolve(res.key)
       }
     }
     xmlhttp.open("GET", SOURCEURL+IDPATH, true)
     xmlhttp.send()
   })
 }
 function getIdAssertion(){
   return new Promise((resolve, reject) => {
     var xmlhttp = new XMLHttpRequest()
     xmlhttp.onreadystatechange = () => {
       if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
         var res = JSON.parse(xmlhttp.responseText)
         res.error != undefined ? reject(res.error) : resolve(res.key)
       }
     }
     xmlhttp.open("GET", SOURCEURL+IDPATH, true)
     xmlhttp.send()
   })
 }
 function str2ab(str) {
   var buf = new ArrayBuffer(str.length);
   var bufView = new Uint8Array(buf);
   for (var i=0, strLen=str.length; i < strLen; i++) {
     bufView[i] = str.charCodeAt(i);
   }
   return buf;
 }

 function ab2str(buf) {
   return String.fromCharCode.apply(null, new Uint8Array(buf));
 }

// IDP Proxy code
var idp = {
  /**
  * Generation of an IdAssertion through OIDC IdP
  */
  generateAssertion: (contents /*, origin, hint */) => {
    //Compute nonce + content
    var nonce = btoa(JSON.stringify({'sdp':contents,'n':Math.random()}))
    return new Promise((resolve, reject) =>
      getProxyID()
      .then(ID => {
        var _url = SOURCEURL+
                   AUTHPATH+
                   //TODO Remove webrtc scope
                   '?scope=' + FULLSCOPE +
                   '&client_id=' + ID +
                   '&redirect_uri=' + SOURCEURL + DONEPATH +
                   '&response_type=' + TYPE +
                   '&nonce=' + nonce +
                   //TODO Remove rtcsdp
                   '&rtcsdp='+btoa(contents)
        // So, how do I authenticate?

        var myInit = { method: 'GET',
                     //headers: myHeaders,
                       credentials: 'same-origin',
                       // we don't follow redirect so that if user is not logged (redirect)
                       // we get an error an can return login URL to the application
                       redirect: 'error'};
        //var urlW = 'https://localhost:8080/proxy/authorize?scope=openid&client_id=LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUlHZk1BMEdDU3FHU0liM0RRRUJBUVVBQTRHTkFEQ0JpUUtCZ1FDY0Vnckx0WVRIUHAvdHFCQ3BUL1UwS1dJTQo0d2lkaGNFWEd1UkZCZDN3TlpPY0huMnRFanZaTkhmc3NvUXR0UjBOVEQ1USs5UGR0TWZJTFhxU3E3V3htMk5sCkNhNXJTVHpmT1k5NWhZQms3UVBZdTN6dEVQUHVOQ3B1Mld6QlQ2ZGg4YXpVOGUvRHZYV2RwbHpXdmpuTmduVGIKSHZOK01PWU84SGhLMkZWR2F3SURBUUFCCi0tLS0tRU5EIFBVQkxJQyBLRVktLS0tLQo=&redirect_uri=https://localhost:8080/proxy/done&response_type=id_token%20token&nonce=N-0.9316785699162342'

        fetch(_url,myInit)
        .catch(error => {
          console.log(error)
          // We just login but we could do something better maybe?
          // Handling authorizations and such
          var loginURL = SOURCEURL+'/login'
          reject({'name': 'IdpLoginError', 'loginUrl': loginURL, 'requestedUrl': _url})
        })
        .then(response => response.text())
        .then(hash => {
        dump(hash)
          var json = {}
          var data = hash.split('&').toString().split(/[=,]+/);
          for(var i=0; i<data.length; i+=2){
            json[data[i]]=data[i+1];
          }

          resolve({'assertion': json.id_token, 'idp': idp_addr})
        })
      })
//              // this will open a window with the URL which will open a page
//              // sent by IdP for the user to insert the credentials
//              // the IdP validates the credentials then send a access token
//          window.open(_url, 'openIDrequest', 'width=800, height=600')
//              // respond to events
//          this.addEventListener('message', event => {
//            if(event.origin !== SOURCEURL) return;
//
//            resolve(JSON.parse(event.data).id_token)
//            //idp.validateAssertion(res.id_token).then(
//            //    response => resolve(response), error => reject(error))
//          },false)
  )},
  /**
  * Verification of a received IdAssertion validity
  * Can also be used to validate token received by IdP
  * @param  {DOMString} assertion assertion
  */
  validateAssertion: (assertion /*, origin */) => {
    assertion = assertion.split(".")
    var header = assertion[0],
        payload = assertion[1],
        signature = assertion[2]
    //TODO there is probably a better way to do that?
    signature = signature.replace(/_/g, "/").replace(/-/g, "+")
    return new Promise((resolve, reject) =>
      getProxyKey()
      .then(Key => crypto.subtle.importKey('jwk',Key,{ name: 'RSASSA-PKCS1-v1_5',hash: {name: "SHA-256"}},true, ['verify']))
      .then(JWK =>
        //crypto.verify(algo, key, signature, text2verify);
        crypto.subtle.verify('RSASSA-PKCS1-v1_5',
                           JWK,
                           str2ab(atob(signature)),   //ArrayBuffer of the signature,
                           str2ab(header+"."+payload)))//ArrayBuffer of the data
      .then(result => {
        if (!result) reject({'name':'IdpError', 'message':'Invalid signature on identity assertion'})
        else {
            var json = JSON.parse(atob(payload))
            // hack to get only the name and remove any @mail.com
            // Mozilla want us to provide a username with name@DOMAIN
            // where DOMAIN is IdP Proxy DOMAIN
            var name = json.sub.split('@')[0]
            // Decode nonce to get contents
            var contents = JSON.parse(atob(json.nonce)).sdp
            resolve({'identity': name+'@'+idp_addr.domain, 'contents': contents})
      }})
      .catch(error => reject({'name':'IdpError', 'message':error}))
    )}
}

if (typeof rtcIdentityProvider != 'undefined') {
  rtcIdentityProvider.register(idp);
  console.log("Proxy loaded")
} else {
  console.warn('IdP not running in the right sandbox');
}