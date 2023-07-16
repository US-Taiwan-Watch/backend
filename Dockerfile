FROM node:16

# Create app directory
RUN mkdir /opt/app
WORKDIR /opt/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY ./package*.json ./
COPY ./tsconfig.json ./
COPY ./yarn.lock .yarnrc.yml ./
COPY ./.env ./
RUN yarn set version stable

RUN yarn install

# Bundle app source
COPY ./src ./src
COPY ./common ./common

# Bypass FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed
# - JavaScript heap out of memory
ENV NODE_OPTIONS=--max_old_space_size=8192
RUN yarn build

EXPOSE 5487
CMD [ "yarn", "start" ]
