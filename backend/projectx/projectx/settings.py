
import os
from pathlib import Path
from decouple import config
from datetime import timedelta
from storages.backends.s3boto3 import S3Boto3Storage
from decouple import config
import dj_database_url



# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Quick-start development settings - unsuitable for production
SECRET_KEY = config('SECRET_KEY')
DEBUG = True
ALLOWED_HOSTS = [
    'localhost',
    '127.0.0.1',
   
]
# CORS settings
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
   
]
# REQUIRED FOR DJANGO ADMIN POST/DELETE FROM FRONTEND
CSRF_TRUSTED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  
]

INSTALLED_APPS = [
    'daphne',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt',
    'accounts',
    'trading',
    'corsheaders',
    'dashboard',
    'wallet',
    'forex',
    'agents',
    'customercare',
    'management',
    'traderpulse',
    'copy_trading.apps.CopyTradingConfig',
    'channels',
    

    
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'projectx.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]
AUTH_USER_MODEL = 'accounts.User'

WSGI_APPLICATION = 'projectx.wsgi.application'

AUTHENTICATION_BACKENDS = [
    'accounts.backends.EmailBackend',
    'django.contrib.auth.backends.ModelBackend',
]



DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}


#DATABASES = {
#    'default': {
#        'ENGINE': 'django.db.backends.postgresql',
#        'NAME': os.getenv('DB_NAME', 'binaryfx'),
#        'USER': os.getenv('DB_USER', 'binaryfx_user'),
#        'PASSWORD': os.getenv('DB_PASSWORD', 'kQEUGRYh9T9bQAnYVvvl7TyTIw0E5myk'),
#        'HOST': os.getenv('DB_HOST', 'dpg-d426i16uk2gs73bb6j70-a.oregon-postgres.render.com'),
#        'PORT': os.getenv('DB_PORT', '5432'),
#    }
#}

#DATABASES = {
#    'default': {
#        'ENGINE': 'django.db.backends.sqlite3',
#        'NAME': BASE_DIR / 'db.sqlite3',
#    }
#}
#

#DATABASES = {
#    'default': {
#        'ENGINE': 'django.db.backends.postgresql',
#        'NAME': os.getenv('DB_NAME', 'binaryfx'),
#        'USER': os.getenv('DB_USER', 'binaryfx_user'),
#        'PASSWORD': os.getenv('DB_PASSWORD', 'kQEUGRYh9T9bQAnYVvvl7TyTIw0E5myk'),
#        'HOST': os.getenv('DB_HOST', 'dpg-d426i16uk2gs73bb6j70-a.oregon-postgres.render.com'),
#        'PORT': os.getenv('DB_PORT', '5432'),
#    }
#}


# ──────────────────────────────────────────────────────────────
# DATABASE – works on Render build + runtime + local dev
# ──────────────────────────────────────────────────────────────
if "DATABASE_URL" in os.environ:
    # Render production (and preview environments)
    DATABASES = {
        "default": dj_database_url.parse(
            os.environ["DATABASE_URL"],
            conn_max_age=0,
            conn_health_checks=True,
            ssl_require=True,
        )
    }
else:
    # Local development OR Render build step → fall back to SQLite
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }
  
ASGI_APPLICATION = 'projectx.asgi.application'
# Redis Layer (already added from earlier)
import os
from urllib.parse import urlparse

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379")
redis_parsed = urlparse(REDIS_URL)
redis_address = f"redis://{redis_parsed.username}:{redis_parsed.password}@{redis_parsed.hostname}:{redis_parsed.port or 6379}{redis_parsed.path or ''}"

# settings.py — YOUR STYLE, BUT 100% FIXED

import os
from django.core.exceptions import ImproperlyConfigured

# Your Redis URL (local dev example)
redis_address = os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0")

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [redis_address],
            "symmetric_encryption_keys": [SECRET_KEY],  # ← You keep this (good!)
            "capacity": 1000,
            "expiry": 60,
           
        },
    },
}

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'accounts.authentication.SuspendedUserJWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}


# OpenAI Config
OPENAI_API_KEY = config('OPENAI_API_KEY', default=None)
OPENAI_MODEL = config('OPENAI_MODEL', default='gpt-3.5-turbo')

# Frontend URL for signals/emails
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000')


# Email configuration
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_HOST_USER = 'traderiserpro@gmail.com'
EMAIL_HOST_PASSWORD = 'ixinhoofcsnzjkqb'  # App-specific password for Gmail
EMAIL_USE_TLS = True
DEFAULT_FROM_EMAIL = 'TradeRiser <traderiserpro@gmail.com>'  # Must match EMAIL_HOST_USER or a verified alias
ADMIN_EMAIL = 'globalgrowthinvest@gmail.com'  # Admin email for deposit notifications

# ──────────────────────────────────────────────────────────────
#  S3 / Media – read from .env
# ──────────────────────────────────────────────────────────────
from decouple import config, Csv

# ---- AWS credentials ------------------------------------------------
AWS_ACCESS_KEY_ID      = config('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY  = config('AWS_SECRET_ACCESS_KEY')
AWS_STORAGE_BUCKET_NAME = config('AWS_STORAGE_BUCKET_NAME')
AWS_S3_REGION_NAME     = config('AWS_S3_REGION_NAME', default='us-east-1')

# ---- Optional S3 tweaks --------------------------------------------
AWS_S3_CUSTOM_DOMAIN   = f'{AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com'
AWS_DEFAULT_ACL        = config('AWS_DEFAULT_ACL', default=None, cast=lambda v: None if v == 'None' else v)
AWS_S3_FILE_OVERWRITE  = config('AWS_S3_FILE_OVERWRITE', default=False, cast=bool)

# ---- Storage choice -------------------------------------------------
if DEBUG:
    # ---- LOCAL DEVELOPMENT (no S3, no credentials needed) ----------
    DEFAULT_FILE_STORAGE = 'django.core.files.storage.FileSystemStorage'
    MEDIA_ROOT = BASE_DIR / 'media'
    MEDIA_URL  = '/media/'
else:
    # ---- PRODUCTION / STAGING (real S3) -----------------------------
    DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'

# Optional: Ensure media URLs point to S3
MEDIA_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/'

# settings.py
CELERY_BROKER_URL = 'redis://localhost:6379/0'  # Default Redis URL
CELERY_RESULT_BACKEND = 'redis://localhost:6379/0'
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'UTC'  # Or your TZ
CELERY_BEAT_SCHEDULER = 'django_celery_beat.schedulers:DatabaseScheduler'  # For dynamic scheduling


POLYGON_API_KEY = 'qZa9l7TuOwcFhEh3Tpj8tYIqBM8F43qQ'




AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

SESSION_COOKIE_AGE = 1209600  # 2 weeks
SESSION_EXPIRE_AT_BROWSER_CLOSE = False
SESSION_COOKIE_SECURE = True  # Set to True in production with HTTPS
SESSION_COOKIE_SAMESITE = 'Lax'  # or 'None' if cross-origin
CSRF_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SECURE = True

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=2),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'AUTH_HEADER_TYPES': ('Bearer',),
}
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'  # Add this line
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
