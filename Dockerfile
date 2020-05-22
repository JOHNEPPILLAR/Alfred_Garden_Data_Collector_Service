FROM node:14

RUN ln -snf /usr/share/zoneinfo/Europe/London /etc/localtime && echo Europe/London > /etc/timezone \
	&& mkdir -p /home/nodejs/app \
	&& apt-get update -y \
	&& apt-get upgrade -yqq \
    && apt-get install -y bluetooth bluez libbluetooth-dev libudev-dev libcap2-bin \
	git \ 
	g++ \
	gcc \
	libstdc++ \
	make \
	python \
	&& npm install --quiet node-gyp -g \
	&& rm -rf /var/cache/apk/*

WORKDIR /home/nodejs/app

COPY package*.json ./

RUN setcap cap_net_raw+eip $(eval readlink -f `which node`)

RUN npm install

COPY --chown=node:node . .

USER node

HEALTHCHECK --start-period=60s --interval=10s --timeout=10s --retries=6 CMD ["./healthcheck.sh"]

EXPOSE 3981
