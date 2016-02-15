FROM node
RUN mkdir -p /code/lib /code/static /code/templates
COPY package.json /code
COPY lib /code/lib
COPY static /code/static
COPY templates /code/templates
WORKDIR /code
RUN npm install
