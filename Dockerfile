# Stage 1: Build the React application 
FROM node:20-alpine as build 
WORKDIR /app 
COPY package*.json ./ 
RUN npm install 
# Baris ini akan meng-copy semua file, TERMASUK file .env yang digenerate oleh Papuyu
COPY . . 

# Define all build arguments
ARG VITE_API_BASE_URL
ARG VITE_API_KEY
ARG VITE_API_PATH
ARG VITE_WA_API_URL
ARG VITE_API_USERNAME
ARG VITE_API_PASSWORD
ARG VITE_REQUIRE_OTP
ARG VITE_APP_TITLE
ARG VITE_APP_DESC
ARG VITE_CLINIC_NAME
ARG VITE_APP_COMPANY

# Set environment variables during build
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_API_KEY=$VITE_API_KEY
ENV VITE_API_PATH=$VITE_API_PATH
ENV VITE_WA_API_URL=$VITE_WA_API_URL
ENV VITE_API_USERNAME=$VITE_API_USERNAME
ENV VITE_API_PASSWORD=$VITE_API_PASSWORD
ENV VITE_REQUIRE_OTP=$VITE_REQUIRE_OTP
ENV VITE_APP_TITLE=$VITE_APP_TITLE
ENV VITE_APP_DESC=$VITE_APP_DESC
ENV VITE_CLINIC_NAME=$VITE_CLINIC_NAME
ENV VITE_APP_COMPANY=$VITE_APP_COMPANY

# Vite akan otomatis membaca file .env tersebut
RUN npm run build 

# Stage 2: Serve the application using Nginx 
FROM nginx:alpine 
COPY --from=build /app/dist /usr/share/nginx/html 
COPY nginx.conf /etc/nginx/conf.d/default.conf 
EXPOSE 80 
CMD ["nginx", "-g", "daemon off;"]