# Use an official Node runtime as a parent image
FROM node:18-alpine

# Set work directory
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy project
COPY . .

# Expose port 5173
EXPOSE 5173

# Run the application
CMD ["npm", "run", "dev", "--", "--host"]
