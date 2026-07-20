FROM node:20-alpine

WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the application code
COPY . .

# Next.js telemetry
ENV NEXT_TELEMETRY_DISABLED 1

# Expose port and start
EXPOSE 3000
CMD ["npm", "run", "dev"]
