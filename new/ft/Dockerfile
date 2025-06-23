# Stage 1: Build React app
FROM public.ecr.aws/docker/library/node:18 AS builder

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .
RUN npm run build

# Stage 2: Serve using Nginx
FROM public.ecr.aws/docker/library/nginx:alpine

# Remove default config
RUN rm -rf /etc/nginx/conf.d/default.conf

# Copy custom nginx config with explicit path
COPY ./nginx.conf /etc/nginx/conf.d/default.conf

# Copy built React files
COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
