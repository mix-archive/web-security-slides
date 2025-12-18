FROM php:8.2-apache-trixie

# System dependencies for PHP extensions, Chromium (Puppeteer), Node.js, and SQLite
RUN apt-get update && \
    apt-get install -y --no-install-recommends chromium tini curl sqlite3 libsqlite3-dev libonig-dev && \
    curl -fsSL https://deb.nodesource.com/setup_24.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# PHP extensions
RUN docker-php-ext-install pdo pdo_mysql mysqli mbstring pdo_sqlite

# Apache config
RUN a2enmod rewrite
COPY blog/000-default.conf /etc/apache2/sites-available/000-default.conf

WORKDIR /app

# Copy application code
COPY blog /var/www/html
COPY bot /app/bot

# Install bot dependencies (no cached artifacts kept)
ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
RUN cd /app/bot && npm ci --omit=dev && \
    npm cache clean --force && rm -rf /root/.npm /tmp/* /var/tmp/*

# Prepare SQLite database
ENV DB_DRIVER=sqlite \
    DB_PATH=/var/www/html/database.sqlite \
    BLOG_HOST=localhost

RUN sqlite3 "$DB_PATH" < /var/www/html/config/init.sqlite.sql && \
    chown www-data:www-data "$DB_PATH"

# Permissions for web root (owner-only access)
RUN chown -R www-data:www-data /var/www/html && \
    find /var/www/html -type d -exec chmod 750 {} \; && \
    find /var/www/html -type f -exec chmod 640 {} \;

EXPOSE 80
EXPOSE 3000

ENTRYPOINT ["tini", "--"]
# Run bot with FLAG (if provided), then unset FLAG before starting Apache
CMD ["bash", "-lc", "(cd /app/bot && FLAG=\"$FLAG\" node app.js) & unset FLAG; exec apache2-foreground"]

