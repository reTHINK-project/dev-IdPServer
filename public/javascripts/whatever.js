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
// Demonstration that if the IdP Proxy is not hosted on the IdP Domain (and the verification is not done) we can
// assert whatever we want.

var idp_addr = {'domain': 'google.com', 'protocol': 'whatever'}

// IDP Proxy code
var idp = {
  /**
  * Generation of an IdAssertion
  */
  generateAssertion: (contents , origin, hint) => {
    return new Promise((resolve, reject) =>{
        var assertion = JSON.stringify({
            'contents': contents,
            'hint': hint
        })

        resolve({'assertion': btoa(assertion), 'idp': idp_addr})
    })
  },

  // Yeah, well, you know, ..., whatever
  validateAssertion: (assertion, origin) => {

    return new Promise((resolve, reject) =>{
        var decoded = JSON.parse(atob(assertion))
        resolve({'identity': decoded.hint, 'contents': decoded.contents})
    })
  }
}