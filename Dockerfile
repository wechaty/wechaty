FROM node:6.3.1-onbuild

RUN apt-get update && apt-get install -y \
  xvfb

COPY entrypoint.sh /entrypoint.sh
RUN bash -n /entrypoint.sh && chmod a+x /entrypoint.sh
  
ENTRYPOINT [ "/entrypoint.sh" ]
CMD [ "start" ]
