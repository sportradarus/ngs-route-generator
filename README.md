# ngs-route-generator by Sportradar 


### Prerequisites

- You need git to clone the repository. You can get git from [http://git-scm.com/](http://git-scm.com/).
- You'll need [Docker for Mac](https://docs.docker.com/engine/installation/mac/). If you have an OLD version of docker, uninstall it and install the newest, currently Version 1.12.3 (13776).
- Login to AWS to get access to AWS Linux Images with `eval $(aws ecr get-login --region us-west-2 --registry-ids 137112412989)`

### Clone

Clone the repository: [https://github.com/sportradarus/ngs-route-generator](https://github.com/sportradarus/ngs-route-generator) to a local folder.


### Install configs

The application needs a config file or ENV set to work. When running locally you can
just put these in .env in the document root. When running in production, these should be set
in the environment. Here are the values that need proper config values:

.env file should contain this (you can copy and paste this as is):
```
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_DEFAULT_REGION=us-west-2
AWS_REGION=us-west-2
AWS_NGS_BUCKET=sportradarus-ngs
```


### Build
```
npm run build
```

This will create a nodejs container and install all dependencies in container. See the `Dockerfile` and `docker-compose.yml` for exact details. This only needs to be run on initial install and if dependencies are updated.




### TEST
```
npm test
```
Testing spins up the container and runs the tests inside of the container. To run in watch mode run `npm test -- -- -w', yes you need all those dashes.


### TEST INDIVIDUAL LAMBDA FUNCTIONS E2E

Run these in sequence. See `test/event.json` files for game test ids.
```
npm run test-route
```


### DEPLOY
```
npm run deploy-route(see package.json)
```
Each lambda is deployed independently. The npm run command will call `node-lambda` inside the container and compile the app into a zip file, which is then uploaded to AWS. This command can be called manually but **note** it is automatically deployed when there are commits to `master` via TravisCI.


