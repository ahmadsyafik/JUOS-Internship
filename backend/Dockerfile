FROM --platform=linux/amd64 php:8.3-cli

# Install dependencies system
RUN apt-get update && apt-get install -y \
    libpq-dev \
    libzip-dev \
    zip unzip \
    libreoffice-writer \
    default-jre-headless \
    fonts-liberation \
    fonts-dejavu \
    && docker-php-ext-install pdo_pgsql zip \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*
    
# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /app

# Copy source code
COPY . .

# Install Laravel dependencies
RUN composer install

# Expose Laravel port
EXPOSE 8000

# Run Laravel
CMD ["php", "artisan", "serve", "--host=0.0.0.0"]