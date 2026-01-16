# Use nginx alpine for a lightweight static file server
FROM nginx:alpine

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy all static files
COPY . /usr/share/nginx/html/

# Remove unnecessary files from the container
RUN rm -f /usr/share/nginx/html/Dockerfile \
    /usr/share/nginx/html/nginx.conf \
    /usr/share/nginx/html/.git* \
    /usr/share/nginx/html/README.md \
    /usr/share/nginx/html/cloudbuild.yaml 2>/dev/null || true

# Expose port 8080 (Cloud Run default)
EXPOSE 8080

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
