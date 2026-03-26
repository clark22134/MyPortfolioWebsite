FROM mysql:8.0
COPY init/ /docker-entrypoint-initdb.d/
ENV MYSQL_DATABASE=full-stack-ecommerce
ENV MYSQL_USER=ecommerceapp
ENV MYSQL_PASSWORD=ecommerceapp
ENV MYSQL_ROOT_PASSWORD=rootpassword
