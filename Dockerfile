FROM node:onbuild

# Get Sources
COPY	. /src
# Clean node_modules
CMD 	["rm", "-rf", "node_modules"]
RUN	cd /src; npm install
 
# Overwrite openid-connect
COPY	./node_modules/openid-connect/index.js node-modules/openid-connect/index.js

EXPOSE	8080
