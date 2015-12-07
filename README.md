To install the Node.js OIDC server providing the WebRTC IDPProxy:  
clone the repository & launch  

_docker-compose up_

OR

_docker build -t oidc-node .  
docker run --name redis -p 6379:6379 -d  
docker run --name oidc-node -p 8080:8080 --link redis:redis -d oidc-node_  
