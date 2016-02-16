FROM node
RUN mkdir -p /code/lib /code/static /code/templates
COPY package.json /code
COPY lib /code/lib
COPY static /code/static
COPY templates /code/templates
COPY setup_dev.sh /code
WORKDIR /code
RUN npm install -g nodemon
RUN npm install
EXPOSE 8080
