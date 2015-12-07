FROM node:onbuild

# Get Sources
#COPY	./openid-connect-server.js /src/
#COPY	./package.json /src/
#COPY 	./public /src/
#COPY	./config.js /src/
# Clean node_modules
RUN	    npm install

# Overwrite openid-connect
COPY	./openid-connect/index.js ./node_modules/openid-connect/index.js

EXPOSE	8080
