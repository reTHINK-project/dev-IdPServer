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
//class NodeOIDCProxy {
  
  var SOURCEURL = "http://luna.local:3001"
  var REDIRECT = "http://luna.local:3001"
  var LOGINPATH = "/user/authorize"
  // Proxy downloaded from SOURCEURL+/.well-known/idp-proxy/+PROXYTYPE
  var PROXYTYPE = "rethink-oidc"
  var VERIFYPATH = "/verify"
  var IDSCOPE = "openid"
  var FULLSCOPE = "openid profile"
  var TYPE       =   'id_token token';
//    var TYPE       =   'code';
  
  
  // Client ID is also public key for id_token verification (ATM)
  var IDPROXYID = "LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUlHZk1BMEdDU3FH"+
                  "U0liM0RRRUJBUVVBQTRHTkFEQ0JpUUtCZ1FDNEROVTd0TTcwS0o4"+
                  "MkhNSDFhL3JNV0JWbwpWckxyL0Q0NXJwSkFGeSsxUjdIdWJLdGZS"+
                  "c2xoZ0JZaHdnYWExQmlhazhBemRzWGdxeFAva0orUjYybE9aUWNO"+
                  "Cm0vY091UWVlcDIzTzQ2TlRFYU5aUFRFdDRPOGhONVhMYUoySEE4"+
                  "YU5NNlBIbXlYTnN4REFESjJkMzdVTlNWY0EKSHdBRnFHeVNFVkI2"+
                  "ZjBPamdRSURBUUFCCi0tLS0tRU5EIFBVQkxJQyBLRVktLS0tLQo="
                  
                  
  var _url = SOURCEURL+LOGINPATH+'?scope=' + IDSCOPE + '&client_id=' + IDPROXYID +
            '&redirect_uri=' + SOURCEURL + '&response_type=' + TYPE +
            '&nonce=' + '01987'
//  /**
//  * USER'S OWN IDENTITY
//  */
//  constructor() {
//
//  }
//
//  /**
//  * Register a new Identity with an Identity Provider
//  */
//  registerIdentity() {
//    // Body...
//  }
//
//  /**
//  * In relation with a classical Relying Party: Registration
//  */
//  registerWithRP() {
//    // Body...
//  }
//
//  /**
//  * In relation with a classical Relying Party: Login
//  * @param  {Identifier}      identifier      identifier
//  * @param  {Scope}           scope           scope
//  * @return {Promise}         Promise         IDToken
//  */
  function loginWithRP() {

    var LOGOUT     =   'http://accounts.google.com/Logout';
    var id_token;
    var acToken;
    var tokenType;
    var expiresIn;
    var user;
    var tokenID;
    var loggedIn = false;
    
    return new Promise(function(resolve, reject) {

      // this will open a window with the URL which will open a page sent by google for the user to insert the credentials
      // when the google validates the credentials then send a access token
      var win = window.open(_url, 'openIDrequest', 'width=800, height=600');
      
      // respond to events
      window.addEventListener('message',function(event) {
        if(event.origin !== SOURCEURL) return;
        
        var res = JSON.parse(event.data)
        validateAssertion(res.id_token).then(function(response) {
          resolve(response)
        }, function(error) {
          reject(error);
        })
      },false);
      
    });
  }


  /**
  * OTHER USER'S IDENTITY
  */

  /**
  * Verification of a received IdAssertion validity
  * Can also be used to validate token received by IdP
  * @param  {DOMString} assertion assertion
  */
  function validateAssertion(assertion) {
    // Split using '.'
    // Header
    // Body
    // Signature
    // Get key from server URL
    // Verify Signature
    
    return new Promise(function(resolve, reject) {
      var xmlhttp = new XMLHttpRequest();
      xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
          var res = JSON.parse(xmlhttp.responseText);
          if (res.error != undefined) {
            reject(res.error)
          } else {
            resolve(res.id_token)
          }
        }
      };
      xmlhttp.open("GET", SOURCEURL+VERIFYPATH+"?key="+IDPROXYID+"&id_token="+assertion, true);
      xmlhttp.send();
    })
  }

  /**
  * Trust level evaluation of a received IdAssertion
  * @param  {DOMString} assertion assertion
  */
  function getAssertionTrustLevel(assertion) {
    // Body...
  }

//
//  /**
//  * In relation with a Hyperty Instance: Associate identity
//  */
//  setHypertyIdentity() {
//    // Body...
//  }
//
//  /**
//  * Generates an Identity Assertion for a call session
//  * @param  {DOMString} contents     contents
//  * @param  {DOMString} origin       origin
//  * @param  {DOMString} usernameHint usernameHint
//  * @return {IdAssertion}              IdAssertion
//  */
//  generateAssertion(contents, origin, usernameHint) {
//    // At the moment login if needed
//    // Save and send assertion
//  }

//}

function getCookie(cname) {
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for(var i=0; i<ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1);
        if (c.indexOf(name) == 0) return c.substring(name.length,c.length);
    }
    return "";
}

console.log("Proxy loaded")