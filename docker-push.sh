#!/bin/bash
export $(cat .env | xargs)

HOST="ustaiwanwatch.azurecr.io"
IMG_TAG="ustw-backend:latest"

docker build -t $IMG_TAG .
docker login $HOST -u $ACR_USER -p $ACR_PASS
docker tag $IMG_TAG $HOST/$ACR_USER/$IMG_TAG
docker push $HOST/$ACR_USER/$IMG_TAG
