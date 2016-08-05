FROM node:6.3.1-onbuild

COPY entrypoint.sh /entrypoint.sh
RUN bash -n /entrypoint.sh && chmod a+x /entrypoint.sh

ENTRYPOINT [ "/entrypoint.sh" ]
CMD [ "start" ]
