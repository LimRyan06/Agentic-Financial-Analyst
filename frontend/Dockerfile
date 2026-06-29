FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
RUN npm ci

# Copy remaining code
COPY . .

# Build Next.js app
RUN npm run build

# Start production server
EXPOSE 3000
CMD ["npm", "start"]
