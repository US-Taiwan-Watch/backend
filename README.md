# USTW Backend

## Prepare repo
1. clone repo with submodule `common`: 
   - `git clone --recurse-submodules https://github.com/US-Taiwan-Watch/backend.git`
2. create `.env` in project root and paste the content from [here](https://ustaiwanwatch.sharepoint.com/sites/USTWw/_layouts/15/Doc.aspx?sourcedoc={01469230-a5c4-4eae-8bd5-a41273ae0704}&action=edit&wd=target%28Untitled%20Section.one%7Ca745a153-ea3f-4b6e-8f16-9163bfe64932%2F.env%20%28backend%5C%29%7C3dc8a337-61d1-499a-9d4b-f92036933645%2F%29&wdorigin=703)
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