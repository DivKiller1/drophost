FROM nginx:alpine

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

RUN chmod -R 777 /etc/nginx/conf.d

# Copy base config
COPY nginx/nginx.conf /etc/nginx/nginx.conf

# Copy dashboard static files
COPY .. /dashboard/ /usr/share/nginx/html/

EXPOSE 80

