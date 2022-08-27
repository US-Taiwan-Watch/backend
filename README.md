# USTW Backend

## Prepare repo
1. clone repo with submodule `common`: 
   - `git clone --recurse-submodules https://github.com/US-Taiwan-Watch/backend.git`
2. create `.env` in project root and paste the content from [here](https://dev.azure.com/ustw/US%20Taiwan%20Watch/_apis/git/repositories/secret-credentials/items?path=/backend-env&api-version=6.0)
3. Make sure you have Node.js 16+, NPM, and yarn. Install modules:
   - `yarn install`

## Local Development
1. Run `yarn dev`
2. Local API endpoint launches at: `http://localhost:5487`

## Local Production
1. Run `yarn build`
2. Run `yarn start`
3. Local API endpoint launches at: `http://localhost:5487`

## Deployment
1. Make sure your Docker daemon is running
2. Just run `docker-push.sh`
   - No need to run `yarn build` where it's already taken care