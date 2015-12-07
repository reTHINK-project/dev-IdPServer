FROM node:onbuild

# Get Sources
COPY	. /src
RUN	cd /src; npm install

# Overwrite openid-connect
COPY	./node_modules/openid-connect/index.js node-modules/openid-connect/index.js

EXPOSE	8080
