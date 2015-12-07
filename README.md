docker-compose up

OR

docker build -t oidc-node .
docker run --name -p 6379:6379 -d redis
docker run --name oidc-node -p 8080:8080 --link redis:redis -d oidc-node
