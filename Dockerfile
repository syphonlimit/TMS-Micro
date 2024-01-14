#Use node:18-alpine as base image
FROM node:18-alpine

#Set working directory inside image
WORKDIR /tms

#Install app dependencies
#A wildcard is used to ensure both package.json AND package-lock.json are copied
#where available (npm@5+)
COPY package*.json ./
RUN npm install

#Copy everything from src directory into working directory
COPY . .

#Add user so we don't need to run as root
RUN adduser -u 1001 -D user
USER user

#Expose port and start application
EXPOSE 8888
CMD ["node", "app.js"]