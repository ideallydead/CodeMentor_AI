FROM node:20-alpine
WORKDIR /app/frontend/student-portal
COPY student-portal/package*.json ./
RUN npm install
COPY student-portal ./
EXPOSE 4173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "4173"]
