FROM 137112412989.dkr.ecr.us-west-2.amazonaws.com/amazonlinux:latest

ENV APP_FOLDER=/home/ngs-route-generator

RUN yum -y update && \
    yum -y install git zip gcc44 gcc-c++ libgcc44 cmake ImageMagick ImageMagick-devel && \
    
    curl --silent --location https://rpm.nodesource.com/setup_4.x | bash - && \
    yum -y install nodejs && \

    npm install -g npm@3.8.6 && \
    npm install -g node-lambda && \
    npm install -g aws-sdk && \
    npm install -g n && \
    n 4.3.0 


# copy over package.json so we can run npm install on the container
COPY package.json $APP_FOLDER/

WORKDIR $APP_FOLDER
RUN npm install

ADD . $APP_FOLDER
